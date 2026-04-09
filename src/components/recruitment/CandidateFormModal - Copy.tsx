import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { recruitmentKeys } from '../../lib/queryKeys';
import {
  createCandidate,
  updateCandidate,
  CANDIDATE_STAGES,
  type CandidateWithJob,
  type JobWithDetails,
} from '../../lib/recruitmentService';
import toast from 'react-hot-toast';

interface CandidateFormData {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  current_stage: string;
  rating: string;
  notes: string;
  cover_letter: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  candidate?: CandidateWithJob | null;
  job: JobWithDetails;
}

const stageLabels: Record<string, string> = {
  applied: 'Applied',
  screening: 'Screening',
  interview: 'Interview',
  offer: 'Offer',
  hired: 'Hired',
  rejected: 'Rejected',
};

export const CandidateFormModal: React.FC<Props> = ({ isOpen, onClose, candidate, job }) => {
  const queryClient = useQueryClient();
  const isEditing = !!candidate;

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CandidateFormData>({
    defaultValues: {
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      current_stage: 'applied',
      rating: '',
      notes: '',
      cover_letter: '',
    },
  });

  useEffect(() => {
    if (candidate) {
      reset({
        first_name: candidate.first_name,
        last_name: candidate.last_name,
        email: candidate.email,
        phone: candidate.phone || '',
        current_stage: candidate.current_stage || 'applied',
        rating: candidate.rating?.toString() || '',
        notes: candidate.notes || '',
        cover_letter: candidate.cover_letter || '',
      });
    } else {
      reset({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        current_stage: 'applied',
        rating: '',
        notes: '',
        cover_letter: '',
      });
    }
  }, [candidate, reset, isOpen]);

  const mutation = useMutation({
    mutationFn: (data: CandidateFormData) => {
      const payload = {
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email,
        phone: data.phone || null,
        current_stage: data.current_stage,
        rating: data.rating ? parseInt(data.rating) : null,
        notes: data.notes || null,
        cover_letter: data.cover_letter || null,
        job_id: job.id,
        applied_date: new Date().toISOString().split('T')[0],
      };
      return isEditing
        ? updateCandidate(candidate!.id, payload)
        : createCandidate(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: recruitmentKeys.all });
      toast.success(isEditing ? 'Candidate updated' : 'Candidate added');
      onClose();
    },
    onError: () => {
      toast.error('Failed to save candidate');
    },
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Candidate' : `Add Candidate — ${job.title}`}
      size="lg"
    >
      <form onSubmit={handleSubmit(data => mutation.mutate(data))} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              First Name <span className="text-red-500">*</span>
            </label>
            <Input
              {...register('first_name', { required: 'Required' })}
              placeholder="First name"
            />
            {errors.first_name && <p className="text-red-500 text-xs mt-1">{errors.first_name.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Last Name <span className="text-red-500">*</span>
            </label>
            <Input
              {...register('last_name', { required: 'Required' })}
              placeholder="Last name"
            />
            {errors.last_name && <p className="text-red-500 text-xs mt-1">{errors.last_name.message}</p>}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Email <span className="text-red-500">*</span>
            </label>
            <Input
              {...register('email', { required: 'Required' })}
              type="email"
              placeholder="email@example.com"
            />
            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
            <Input {...register('phone')} placeholder="+971 50 000 0000" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Stage</label>
            <select
              {...register('current_stage')}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {CANDIDATE_STAGES.map(s => (
                <option key={s} value={s}>{stageLabels[s]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Rating (1-5)</label>
            <select
              {...register('rating')}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">No rating</option>
              {[1, 2, 3, 4, 5].map(n => (
                <option key={n} value={n}>{n} {n === 1 ? 'Star' : 'Stars'}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Cover Letter / Summary</label>
          <textarea
            {...register('cover_letter')}
            rows={3}
            placeholder="Candidate's cover letter or summary..."
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Internal Notes</label>
          <textarea
            {...register('notes')}
            rows={3}
            placeholder="Internal recruiter notes..."
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'Saving...' : isEditing ? 'Update' : 'Add Candidate'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
