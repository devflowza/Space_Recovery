-- Distinct, type-coherent color per active case status.
-- Before this, three terminal statuses were near-identical greys
-- (Closed — Device Returned #64748b, Closed — Media Disposed #475569,
-- Cancelled — Customer Declined #6b7280 — the last matching the frontend's
-- unknown-status fallback), and four more pairs collided (two teals, two
-- cyans, two ambers, two greens). New palette groups hues by lifecycle type
-- (intake=blues, diagnosis=cyan, qa=navy, waiting=warm, approved=lime,
-- recovery=teal, ready/delivered=greens, closed=slate/maroon,
-- cancelled=pink/red, no_solution=umber) and deepens every value to a
-- 600–900-grade shade so pill text stays legible on the tinted badge
-- background. Data-only: no DDL, no type changes. Previous values are listed
-- per row for rollback.
UPDATE master_case_statuses AS s
SET color = v.color
FROM (
  VALUES
    ('Registered',                     '#2563EB'), -- was #3b82f6
    ('Device Received',                '#0369A1'), -- was #0ea5e9
    ('In Diagnosis',                   '#0E7490'), -- was #06b6d4
    ('Preparing Quote',                '#D97706'), -- was #f59e0b
    ('Awaiting Customer Approval',     '#C2410C'), -- was #f97316
    ('Approved — In Queue',            '#4D7C0F'), -- was #14b8a6
    ('Recovery in Progress',           '#0F766E'), -- was #0d9488
    ('On Hold — Awaiting Parts',       '#A16207'), -- was #d97706
    ('Verification (QA)',              '#1E40AF'), -- was #0891b2
    ('Ready for Delivery',             '#15803D'), -- was #10b981
    ('Data Delivered',                 '#065F46'), -- was #22c55e
    ('Closed — Device Returned',       '#334155'), -- was #64748b
    ('Closed — Media Disposed',        '#7F1D1D'), -- was #475569
    ('Cancelled — Customer Declined',  '#BE185D'), -- was #6b7280
    ('Cancelled — Unrecoverable',      '#B91C1C'), -- was #ef4444
    ('No Solution — Future Follow-up', '#78350F')  -- was #b45309
) AS v(name, color)
WHERE s.name = v.name
  AND s.is_active;
