import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import type { Database } from '../../types/database.types';

type PayrollRecord = Database['public']['Tables']['payroll_records']['Row'] & {
  employee: {
    first_name: string;
    last_name: string;
    employee_number: string;
  };
  payroll_period: {
    period_name: string;
    start_date: string;
    end_date: string;
  };
  items: Array<{
    component_code: string;
    component_name: string;
    component_type: string;
    amount: number;
    calculation_basis?: string;
  }>;
};

interface PayslipDocumentProps {
  record: PayrollRecord;
  companyName?: string;
}

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 20,
    borderBottom: 2,
    borderBottomColor: '#2563eb',
    paddingBottom: 10,
  },
  companyName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e40af',
    marginBottom: 5,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 20,
    color: '#1f2937',
  },
  section: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    backgroundColor: '#f3f4f6',
    padding: 8,
    marginBottom: 8,
    color: '#374151',
  },
  row: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  label: {
    width: '40%',
    color: '#6b7280',
  },
  value: {
    width: '60%',
    fontWeight: 'bold',
    color: '#1f2937',
  },
  table: {
    marginTop: 10,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#e5e7eb',
    padding: 8,
    fontWeight: 'bold',
    borderBottom: 1,
    borderBottomColor: '#d1d5db',
  },
  tableRow: {
    flexDirection: 'row',
    padding: 8,
    borderBottom: 1,
    borderBottomColor: '#f3f4f6',
  },
  tableColName: {
    width: '50%',
  },
  tableColCalc: {
    width: '25%',
    textAlign: 'center',
  },
  tableColAmount: {
    width: '25%',
    textAlign: 'right',
  },
  totalRow: {
    flexDirection: 'row',
    padding: 10,
    backgroundColor: '#f9fafb',
    marginTop: 5,
    fontWeight: 'bold',
  },
  netSalaryBox: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#dbeafe',
    borderRadius: 4,
  },
  netSalaryLabel: {
    fontSize: 12,
    color: '#1e40af',
    marginBottom: 5,
  },
  netSalaryAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e3a8a',
  },
  footer: {
    marginTop: 30,
    paddingTop: 15,
    borderTop: 1,
    borderTopColor: '#e5e7eb',
    fontSize: 9,
    color: '#6b7280',
    textAlign: 'center',
  },
});

export const PayslipDocument: React.FC<PayslipDocumentProps> = ({ record, companyName = 'xSuite' }) => {
  const formatCurrency = (amount: number) => {
    return `OMR ${amount.toFixed(3)}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const earnings = record.items?.filter((item) => item.component_type === 'earning') || [];
  const deductions = record.items?.filter((item) => item.component_type === 'deduction') || [];

  const totalEarnings = earnings.reduce((sum, item) => sum + Number(item.amount), 0);
  const totalDeductions = deductions.reduce((sum, item) => sum + Number(item.amount), 0);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.companyName}>{companyName}</Text>
          <Text style={{ fontSize: 10, color: '#6b7280' }}>Employee Payslip</Text>
        </View>

        <Text style={styles.title}>
          Salary Slip - {record.payroll_period?.period_name || 'N/A'}
        </Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Employee Information</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Employee Name:</Text>
            <Text style={styles.value}>
              {record.employee?.first_name} {record.employee?.last_name}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Employee Number:</Text>
            <Text style={styles.value}>{record.employee?.employee_number}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Pay Period:</Text>
            <Text style={styles.value}>
              {formatDate(record.payroll_period?.start_date)} -{' '}
              {formatDate(record.payroll_period?.end_date)}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Payment Date:</Text>
            <Text style={styles.value}>
              {record.payment_date ? formatDate(record.payment_date) : 'Not paid'}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Attendance Summary</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Working Days:</Text>
            <Text style={styles.value}>{record.working_days || 0}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Days Worked:</Text>
            <Text style={styles.value}>{record.days_worked || 0}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Days Absent:</Text>
            <Text style={styles.value}>{record.days_absent || 0}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Regular Hours:</Text>
            <Text style={styles.value}>{record.regular_hours || 0}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Overtime Hours:</Text>
            <Text style={styles.value}>{record.overtime_hours || 0}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Earnings</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={styles.tableColName}>Component</Text>
              <Text style={styles.tableColCalc}>Calculation</Text>
              <Text style={styles.tableColAmount}>Amount</Text>
            </View>
            {earnings.map((item, index) => (
              <View key={index} style={styles.tableRow}>
                <Text style={styles.tableColName}>{item.component_name}</Text>
                <Text style={styles.tableColCalc}>{item.calculation_basis || '-'}</Text>
                <Text style={styles.tableColAmount}>{formatCurrency(Number(item.amount))}</Text>
              </View>
            ))}
            <View style={styles.totalRow}>
              <Text style={styles.tableColName}>Total Earnings</Text>
              <Text style={styles.tableColCalc}></Text>
              <Text style={styles.tableColAmount}>{formatCurrency(totalEarnings)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Deductions</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={styles.tableColName}>Component</Text>
              <Text style={styles.tableColCalc}>Calculation</Text>
              <Text style={styles.tableColAmount}>Amount</Text>
            </View>
            {deductions.map((item, index) => (
              <View key={index} style={styles.tableRow}>
                <Text style={styles.tableColName}>{item.component_name}</Text>
                <Text style={styles.tableColCalc}>{item.calculation_basis || '-'}</Text>
                <Text style={styles.tableColAmount}>{formatCurrency(Number(item.amount))}</Text>
              </View>
            ))}
            <View style={styles.totalRow}>
              <Text style={styles.tableColName}>Total Deductions</Text>
              <Text style={styles.tableColCalc}></Text>
              <Text style={styles.tableColAmount}>{formatCurrency(totalDeductions)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.netSalaryBox}>
          <Text style={styles.netSalaryLabel}>Net Salary</Text>
          <Text style={styles.netSalaryAmount}>
            {formatCurrency(Number(record.net_salary))}
          </Text>
        </View>

        <View style={styles.footer}>
          <Text>
            This is a system-generated payslip and does not require a signature.
          </Text>
          <Text style={{ marginTop: 5 }}>
            Generated on {new Date().toLocaleDateString()} by xSuite Payroll System
          </Text>
        </View>
      </Page>
    </Document>
  );
};
