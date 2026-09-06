/** English counterpart of the canonical Project Brain demo data, mirroring `project-data.ts` field for field. */

import {
  MEETING_ANALYSIS_MOCK,
  MEETING_MINUTES_TEXT,
  PROJECT_BRAIN_COPILOT_DEMO,
  PROJECT_BRAIN_MY_DAY_DEMO,
  PROJECT_BRAIN_PLAN,
  PROJECT_BRAIN_PLATFORM_URL,
} from './project-data.ts'
import type {
  ProjectBrainCopilotData,
  ProjectBrainKnowledgeDocument,
  ProjectBrainMeetingAnalysis,
  ProjectBrainMyDayData,
  ProjectBrainPlanData,
} from './project-data.ts'
import type { ProjectBrainLocale } from './locale.ts'

/**
 * English copy of the source-aligned Project Brain plan snapshot. Structured
 * identifiers, dates, and numeric fields keep their original values; only
 * human-readable text is localized. The knowledge-document `status` enum is
 * surfaced as `Published`/`Draft`, so the array is asserted through `unknown`.
 */
export const PROJECT_BRAIN_PLAN_EN: ProjectBrainPlanData = {
  project: {
    id: '-1',
    name: 'Smart Park Construction Project',
    companyName: 'Zhisuan Technology Co., Ltd.',
    management: 'Project Management Dept.',
    summary: 'The Smart Park Construction Project covers the full delivery chain of the park\u2019s intelligent systems, including system construction, device integration, platform development, and end-to-end integration testing. It currently runs 4 implementation phases with 8 critical tasks.',
    goal: 'Complete the park intelligent-system build-out, device integration, platform integration testing, and acceptance handover while keeping key risks under control.',
    owner: 'Zhang Ming',
    startDate: '2026-03-01',
    endDate: '2026-12-31',
    progress: 45,
    pendingTaskCount: 6,
    budget: 12_000_000,
    platformUrl: PROJECT_BRAIN_PLATFORM_URL,
  },
  stages: [
    { id: 'stage-design', name: 'Design & Planning', owner: 'Zhao Xue', startDate: '2026-03-01', endDate: '2026-05-30', deliverable: 'Construction plan review minutes; approved implementation plan' },
    { id: 'stage-procurement', name: 'Equipment Procurement', owner: 'Wang Gang', startDate: '2026-06-01', endDate: '2026-09-30', deliverable: 'Procurement contracts, procurement lists, equipment acceptance reports' },
    { id: 'stage-integration', name: 'System Integration', owner: 'Liu Yang', startDate: '2026-08-01', endDate: '2026-11-15', deliverable: 'Interface documentation, integration reports' },
    { id: 'stage-acceptance', name: 'Acceptance & Delivery', owner: 'Chen Tao', startDate: '2026-10-01', endDate: '2026-12-31', deliverable: 'Acceptance plan, acceptance reports, delivery documentation' },
  ],
  tasks: [
    { id: 'demo-sub-004', title: 'Smart construction plan review', owner: 'Zhao Xue', startDate: '2026-03-15', endDate: '2026-04-20', dependency: '—', progress: 100, deliverable: 'Review minutes', packageId: 'demo-pkg-002' },
    { id: 'demo-sub-005', title: 'Implementation plan approval', owner: 'Zhao Xue', startDate: '2026-04-01', endDate: '2026-05-15', dependency: 'demo-sub-004', progress: 100, deliverable: 'Signed approval', packageId: 'demo-pkg-002' },
    { id: 'demo-sub-001', title: 'Security camera procurement', owner: 'Wang Gang', startDate: '2026-06-01', endDate: '2026-07-15', dependency: 'demo-sub-005', progress: 60, deliverable: 'Procurement contract', packageId: 'demo-pkg-001' },
    { id: 'demo-sub-002', title: 'Access control equipment procurement', owner: 'Wang Gang', startDate: '2026-07-01', endDate: '2026-08-30', dependency: 'demo-sub-001', progress: 20, deliverable: 'Procurement list', packageId: 'demo-pkg-001' },
    { id: 'demo-sub-003', title: 'Equipment arrival acceptance', owner: 'Wang Gang', startDate: '2026-08-01', endDate: '2026-09-30', dependency: 'demo-sub-002', progress: 0, deliverable: 'Acceptance report', packageId: 'demo-pkg-001' },
    { id: 'demo-sub-006', title: 'Security system-platform integration', owner: 'Liu Yang', startDate: '2026-08-01', endDate: '2026-09-30', dependency: 'demo-sub-003', progress: 30, deliverable: 'Interface documentation', packageId: 'demo-pkg-003' },
    { id: 'demo-sub-007', title: 'Energy management system data integration', owner: 'Liu Yang', startDate: '2026-09-01', endDate: '2026-10-31', dependency: 'demo-sub-006', progress: 0, deliverable: 'Integration report', packageId: 'demo-pkg-003' },
    { id: 'demo-sub-008', title: 'Acceptance documentation drafting', owner: 'Chen Tao', startDate: '2026-10-01', endDate: '2026-11-15', dependency: 'demo-sub-007', progress: 5, deliverable: 'Acceptance plan', packageId: 'demo-pkg-004' },
  ],
  risks: [
    { id: 'demo-risk-001', title: 'Equipment procurement delay', type: 'Schedule delay', level: 'High', owner: 'Wang Gang', description: 'The security camera supplier has limited production capacity, so the first shipment is expected to arrive about 2 weeks late.', impact: 'System integration testing will slip at least 2 weeks and push back the overall acceptance milestone.', mitigation: 'Activate the backup supplier plan, coordinate phased deliveries, and agree delay-liability terms.', relatedTaskId: 'demo-sub-003' },
    { id: 'demo-risk-002', title: 'Insufficient supplier vetting', type: 'Blocker', level: 'Medium', owner: 'Wang Gang', description: 'Some suppliers submitted incomplete qualification files and are missing key certifications.', impact: 'Equipment quality and delivery timelines remain uncertain.', mitigation: 'Re-assess qualifications, set a deadline to complete certification materials, and maintain a supplier blacklist.', relatedTaskId: '' },
    { id: 'demo-risk-003', title: 'Test environment delivery delay', type: 'Schedule delay', level: 'Medium', owner: 'Liu Yang', description: 'The server resource request has not been approved yet, so test environment setup is running late.', impact: 'The integration testing window gets compressed and test coverage is at risk.', mitigation: 'Stand up a minimal test environment first and fast-track resource approval.', relatedTaskId: 'demo-sub-006' },
    { id: 'demo-risk-004', title: 'Risk of losing core staff', type: 'Blocker', level: 'Low', owner: 'Zhao Xue', description: 'A key developer on the technical team has signaled intent to leave.', impact: 'Handover of critical modules and development progress may slip.', mitigation: 'Start talent backup, knowledge transfer, and a retention plan.', relatedTaskId: '' },
    { id: 'demo-risk-005', title: 'Requirements change risk', type: 'Blocker', level: 'Low', owner: 'Zhang Ming', description: 'The client requested an additional energy-consumption monitoring module for the park.', impact: 'Project cost could rise about 15% and the schedule extend by about 1 month.', mitigation: 'Run change management to assess scope, cost, and a phased implementation approach.', relatedTaskId: '' },
  ],
  knowledgeFolders: ['Project Documents', 'Technical Proposals', 'Evaluation Reports'],
  meeting: {
    id: 'demo-meeting-001',
    title: 'Smart Park project \u2014 third weekly meeting',
    date: '2026-08-15 14:00',
    host: 'Zhang Ming',
    location: 'Zhisuan Technology 3F Meeting Room A',
    summary: 'The meeting focused on the equipment procurement delay risk and integration testing preparation. The team decided to activate the backup supplier plan and accelerate the minimal test environment setup.',
    actions: [
      { title: 'Finalize the backup supplier plan', owner: 'Wang Gang', dueDate: '2026-08-22' },
      { title: 'Complete the minimal test environment setup', owner: 'Liu Yang', dueDate: '2026-08-20' },
      { title: 'Complete the equipment selection proposal', owner: 'Zhao Xue', dueDate: '2026-08-28' },
      { title: 'Submit supplier qualification supplements', owner: 'Wang Gang', dueDate: '2026-08-25' },
    ],
  },
  knowledgeDocuments: [
    { id: 'demo-know-001', title: 'Smart Park Construction Plan', category: 'Technical Proposals', fileName: 'Smart_Park_Construction_Plan_v2.3.pdf', author: 'Zhao Xue', status: 'Published', summary: 'Overall construction plan covering the security, access control, energy, and parking subsystems.' },
    { id: 'demo-know-002', title: 'Project Implementation Plan', category: 'Project Documents', fileName: 'Project_Implementation_Plan_2026.docx', author: 'Zhang Ming', status: 'Published', summary: 'Phasing, resource allocation, milestones, and the risk response strategy.' },
    { id: 'demo-know-003', title: 'Supplier Evaluation Report', category: 'Evaluation Reports', fileName: 'Supplier_Evaluation_Report_2026Q2.pdf', author: 'Wang Gang', status: 'Published', summary: 'Qualification, capability, and pricing comparison across the major equipment suppliers.' },
    { id: 'demo-know-004', title: 'Equipment Selection Proposal', category: 'Technical Proposals', fileName: 'Equipment_Selection_Proposal_Draft.pdf', author: 'Technical Team', status: 'Draft', summary: 'Core equipment parameters, compatibility, and cost estimates.' },
  ] as unknown as readonly ProjectBrainKnowledgeDocument[],
}

/** English visual dashboard data for the AI project-copilot scenario (doc 03: managed agent briefing). */
export const PROJECT_BRAIN_COPILOT_DEMO_EN: ProjectBrainCopilotData = {
  projectName: PROJECT_BRAIN_PLAN_EN.project.name,
  progress: PROJECT_BRAIN_PLAN_EN.project.progress,
  permissionMode: 'Assisted Execution Mode',
  agentStatus: { scope: 'Checked 28 tasks / 5 risks / 4 meeting action items', lastCheckAt: 'Project check completed just now', nextCheckAt: 'Next auto check at 16:00' },
  metrics: [
    { id: 'progress', label: 'Project Progress', value: '45%', hint: 'Overall progress', tone: 'blue' },
    { id: 'tracking', label: 'AI Follow-ups', value: '3', hint: '2 awaiting feedback', tone: 'green' },
    { id: 'risks', label: 'Risk Items', value: '5', hint: '1 high risk', tone: 'risk' },
    { id: 'decisions', label: 'Needs Your Confirmation', value: '1', hint: 'Procurement related', tone: 'warn' },
  ],
  tracking: [
    { id: 'track-1', title: 'Equipment procurement delivery', status: 'High risk \u00b7 Awaiting supplier feedback', aiActions: ['AI escalated: 2 times'], latestFeedback: 'Supplier expects to confirm shipment by Aug 28', nextStep: 'Reconfirm the delivery date tomorrow morning' },
    { id: 'track-2', title: 'Test environment setup', status: 'Delayed by 5 days', aiActions: ['AI reminded the owner'], latestFeedback: 'Awaiting a new completion date', nextStep: 'Auto follow-up again today at 17:00' },
    { id: 'track-3', title: 'Backup supplier plan', status: 'Delayed by 3 days', aiActions: ['AI raised priority', 'Current owner: Wang Gang'], nextStep: 'If still pending tomorrow, recommend escalation' },
  ],
  findings: [
    { id: 'find-1', label: '1 high-risk item' },
    { id: 'find-2', label: '2 delayed tasks' },
    { id: 'find-3', label: '1 critical milestone may be affected' },
    { id: 'find-4', label: '2 items still awaiting feedback' },
  ],
  findingsNote: 'The procurement risk has been elevated from medium to high.',
  decisions: [
    {
      id: 'decision-1',
      title: 'Escalate equipment procurement?',
      context: 'The supplier has not yet confirmed a final delivery date; further delay could push back the equipment installation milestone.',
      advice: 'If the delivery date is still unconfirmed tomorrow, activate the backup supplier.',
      options: [
        { selection: 'wait-for-confirmation', label: 'Activate if unconfirmed tomorrow' },
        { selection: 'start-backup-supplier', label: 'Activate the backup plan now' },
      ],
    },
  ],
  aiNarrative: {
    focus: [
      'Equipment procurement delay risk: the supplier is expected to slip about 2 weeks, which could affect the equipment installation milestone.',
      'Test environment setup is 5 days late: it is already squeezing the downstream integration testing window.',
      'The backup supplier plan is 3 days late: if the primary supplier keeps slipping, the backup is not ready.',
    ],
    executed: [
      'Followed up with the equipment procurement owner twice in a row and received the supplier\u2019s latest feedback.',
      'Reminded the test environment owner to update the completion date; an automatic follow-up runs tomorrow at 17:00.',
      'Raised the backup supplier plan to a priority follow-up; no action is needed from you on regular tasks.',
    ],
    needDecision: 'If the supplier still cannot confirm a final delivery date tomorrow, I recommend activating the backup supplier plan.',
    next: 'I will reconfirm the procurement delivery date tomorrow morning and check the test environment owner\u2019s feedback today at 17:00. If the procurement risk keeps growing or a critical milestone is affected, I will alert you right away.',
  },
  overview: {
    packages: [
      { id: 'pkg-1', name: 'Design & Planning package', done: 2, total: 2, status: 'Completed' },
      { id: 'pkg-2', name: 'Equipment Procurement package', done: 0, total: 3, status: 'Delayed' },
      { id: 'pkg-3', name: 'System Integration package', done: 1, total: 3, status: 'In progress' },
      { id: 'pkg-4', name: 'Acceptance & Delivery package', done: 0, total: 1, status: 'Preparing' },
    ],
    taskStates: [{ label: 'Completed', count: 2 }, { label: 'On track', count: 5 }, { label: 'Due soon', count: 0 }, { label: 'Delayed', count: 1 }],
    riskLevels: [{ level: 'High risk', count: 1 }, { level: 'Medium risk', count: 2 }, { level: 'Low risk', count: 2 }],
    attention: [
      { id: 'att-1', title: 'Finalize the backup supplier plan', owner: 'Wang Gang', delay: '3 days late', aiNote: 'AI chased 2 times \u00b7 Latest feedback: submit before end of day' },
      { id: 'att-2', title: 'Security camera procurement (batch 2)', owner: 'Wang Gang', delay: 'Expected ~2-week delay', aiNote: 'AI requested a phased delivery commitment and started the backup evaluation' },
    ],
  },
  nextPlan: [
    'Reconfirm the equipment procurement delivery date tomorrow morning',
    'Check the test environment owner\u2019s feedback today at 17:00',
    'Alert immediately if the procurement risk grows or a critical milestone is affected',
  ],
}

/** English cross-project workbench for the personal-assistant scenario (doc 04). */
export const PROJECT_BRAIN_MY_DAY_DEMO_EN: ProjectBrainMyDayData = {
  date: 'August 26, 2026',
  owner: 'Zhang Ming',
  role: 'Project Owner',
  headline: 'Start with these 6 items today',
  subtitle: 'Automatically ordered by due date, project risk, task dependencies, and where people are waiting on you',
  summary: { priority: 2, today: 2, meetings: 1, waiting: 1, projects: 3 },
  groups: [
    {
      id: 'priority',
      title: 'Priority',
      tone: 'risk',
      tasks: [
        {
          id: 'today-1', title: 'Confirm the backup security camera supplier', tags: ['Urgent', 'Critical path'], project: PROJECT_BRAIN_PLAN_EN.project.name, due: 'Due today',
          reason: 'The procurement delay is already affecting the critical path of system integration, and 2 downstream tasks are waiting on this result.',
          detail: [
            'This item is ranked first for 3 reasons:',
            '\u00b7 The procurement delay is already affecting the project\u2019s critical path;',
            '\u00b7 Two downstream tasks are waiting on the supplier\u2019s confirmation;',
            '\u00b7 This item needs to be completed today.',
            'Given its impact and urgency, it is the single most valuable item to tackle now.',
          ],
          primaryAction: 'Open task',
        },
        {
          id: 'today-2', title: 'Make the minimal test environment usable today', tags: ['Urgent', 'Blocking'], project: 'Data Center Migration Project', due: 'Due today',
          reason: 'The test environment is already late and is currently blocking downstream test tasks.',
          detail: [
            'This ranks second: both items are urgent, but this one blocks downstream test tasks directly.',
            '\u00b7 The supplier confirmation affects a longer critical chain;',
            '\u00b7 The test environment blockage sits inside this week\u2019s integration plan.',
            'It therefore follows right after the first item.',
          ],
          primaryAction: 'Chase collaboration',
        },
      ],
    },
    {
      id: 'today',
      title: 'Finish today',
      tone: 'blue',
      tasks: [
        {
          id: 'today-3', title: 'Review the final equipment selection proposal', tags: ['Pre-meeting'], project: PROJECT_BRAIN_PLAN_EN.project.name, due: 'Finish today',
          reason: 'The project review will discuss equipment selection, and this proposal is the key basis for that decision.',
          detail: [
            'It sits in the finish-today area: it does not block anyone immediately, but it is required input for tomorrow\u2019s procurement decision meeting.',
            'Missing today will degrade the quality of tomorrow\u2019s decision.',
          ],
          primaryAction: 'Review materials',
        },
        {
          id: 'today-4', title: 'Update the procurement-delay risk mitigation', tags: ['Risk update'], project: PROJECT_BRAIN_PLAN_EN.project.name, due: 'Finish today',
          reason: 'The risk level has gone up and the response plan needs to be refreshed accordingly.',
          detail: [
            'The mitigation for this risk needs to follow the latest meeting conclusions so it feeds the auto-generated weekly report and managed reminders.',
          ],
          primaryAction: 'Update risk',
        },
      ],
    },
    {
      id: 'meeting',
      title: 'Today\u2019s meeting',
      tone: 'warn',
      tasks: [
        {
          id: 'today-5', title: 'Attend the supplier coordination meeting', tags: ['Meeting'], project: PROJECT_BRAIN_PLAN_EN.project.name, due: 'Today 14:00',
          reason: 'Need to confirm the backup supplier\u2019s quote, delivery timing, and risk accountability.',
          detail: [
            'AI has prepared 3 meeting topics relevant to you:',
            '\u00b7 Backup supplier quote comparison conclusions;',
            '\u00b7 Phased delivery commitment and delay-liability terms;',
            '\u00b7 The original supplier\u2019s capacity-recovery outlook.',
            'The topic notes tie directly to this morning\u2019s follow-up results.',
          ],
          primaryAction: 'View meeting prep',
        },
      ],
    },
    {
      id: 'waiting',
      title: 'Waiting on you',
      tone: 'green',
      tasks: [
        {
          id: 'today-6', title: 'Confirm the energy module change scope', tags: ['Waiting on you'], project: 'Energy Management Upgrade Project', due: 'Waiting 2 days',
          reason: 'The change scope is still unconfirmed, so the other side cannot move into detailed design.',
          detail: [
            'This is the only item where someone is waiting on you:',
            '\u00b7 The client project office has been waiting for 2 days;',
            '\u00b7 Detailed design can only be scheduled after confirmation.',
            'It is not the top priority, but it is worth finishing today.',
          ],
          primaryAction: 'Send feedback',
        },
      ],
    },
  ],
  deferred: [
    { id: 'deferred-1', title: 'Organize historical supplier records', project: PROJECT_BRAIN_PLAN_EN.project.name, reason: 'Nothing depends on it and it does not affect today\u2019s critical milestones, so it was kept out of today\u2019s focus.' },
  ],
  doneToday: [
    { id: 'done-1', title: 'Replied to the test-account permission request' },
    { id: 'done-2', title: 'Confirmed the supplier\u2019s preliminary quote' },
  ],
  reorderNoticeTemplate: 'Done. The remaining items have been re-sorted, and "{title}" is now the most important item for you to handle first.',
}

/** English mock meeting minutes text simulating the 5th weekly project meeting. */
export const MEETING_MINUTES_TEXT_EN = `Smart Park Project \u2014 5th Weekly Meeting Minutes

Meeting time: 2026-08-22 14:00-15:30
Meeting location: Zhisuan Technology 3F Meeting Room A
Chair: Zhang Ming
Attendees: Zhang Ming, Wang Gang, Zhao Xue, Liu Yang, Chen Tao, Li Hua (supplier representative)

Agenda:

I. Review of Last Week
1. Equipment procurement: The first batch of security cameras passed factory inspection and is expected to arrive next week. The access control equipment procurement contract is signed and in production scheduling.
2. System integration: Interface integration for the security system-platform handoff is complete; data integration testing is underway and expected to finish this week.
3. Design and planning: The smart construction plan review is complete, and the implementation plan has been reviewed and approved.

II. Key Discussion Items

1. Equipment procurement delay
Wang Gang reported: the security camera supplier noted that, due to recent raw-material price increases, the second batch delivery may slip by 2 weeks, with arrival expected in mid-September.
Discussion: Zhang Ming pointed out that the delivery delay will directly affect the integration testing schedule, so a backup plan should be finalized quickly.
Decision: Start backup supplier evaluation, owned by Wang Gang, completing qualification review and quote comparison for at least two backup suppliers within this week.

2. Test environment setup
Liu Yang reported: the server resource request is approved, but the equipment room upgrade is not finished, so the environment is expected to be usable only by September 5.
Discussion: Zhao Xue suggested standing up a minimal usable environment on the existing test servers so integration testing is not held up.
Decision: Liu Yang owns standing up a minimal test environment within this week, prioritizing the security system integration test.

3. Energy monitoring module requirements change
Zhang Ming reported: the client formally requested adding a park-wide energy monitoring module to the current project scope.
Discussion: Early assessment shows the new module adds about 15% workload and extends the schedule by about 1 month, so a change management process is needed.
Decision: Zhang Ming owns aligning the change scope, cost, and schedule impact with the client and submitting the change request by next Wednesday.

4. Supplier qualification issues
Wang Gang added: during supplier evaluation, one backup candidate, "Huaxin Technology," submitted incomplete certification files, missing the ISO9001 certificate.
Discussion: Recommend requiring Huaxin Technology to complete the materials by a deadline while starting the evaluation of a third supplier as backup.
Decision: Wang Gang owns notifying Huaxin Technology to supplement certification materials by August 28, and starting the evaluation of "Dingxin Technology" in parallel.

III. Risk Updates
1. Equipment procurement delay risk: escalated from medium to high; the backup plan is expected to ease it once active.
2. Test environment delay risk: the minimal environment reduces the impact; the risk stays at medium level.
3. New requirements change risk: under assessment; the risk level will be updated once the change request is confirmed.

IV. Action Item Summary
1. Wang Gang: complete the backup supplier evaluation and submit the evaluation report \u2014 due August 28
2. Wang Gang: notify Huaxin Technology to supplement certification materials \u2014 due August 25
3. Wang Gang: start the Dingxin Technology qualification evaluation \u2014 due August 28
4. Liu Yang: stand up the minimal test environment \u2014 due August 25
5. Zhang Ming: draft the change request and coordinate with the client \u2014 due September 2
6. Zhao Xue: finalize the equipment selection proposal \u2014 due August 28
7. Chen Tao: prepare acceptance documentation templates \u2014 due August 30`

/** English mock meeting analysis result for the 5th weekly meeting. */
export const MEETING_ANALYSIS_MOCK_EN: ProjectBrainMeetingAnalysis = {
  meetingTitle: '5th Weekly Meeting \u2014 Smart Park Project',
  meetingDate: '2026-08-22 14:00',
  duration: '90 minutes',
  location: 'Zhisuan Technology 3F Meeting Room A',
  host: 'Zhang Ming',
  attendees: ['Zhang Ming', 'Wang Gang', 'Zhao Xue', 'Liu Yang', 'Chen Tao', 'Li Hua'],
  summary: 'The meeting focused on the equipment procurement delay, test environment setup, and the energy monitoring module requirements change. A total of 7 action items and 2 risk updates were identified.',
  agendaItems: [
    { topic: 'Review of last week', presenter: 'Zhang Ming', outcome: 'Confirmed progress across modules: the first security camera batch arrived and the design plan review is complete.' },
    { topic: 'Equipment procurement delay', presenter: 'Wang Gang', outcome: 'Backup supplier evaluation kicked off; qualification review and quote comparison are due within this week.' },
    { topic: 'Test environment setup', presenter: 'Liu Yang', outcome: 'Decided to stand up a minimal usable environment first, prioritizing the security system integration test.' },
    { topic: 'Energy monitoring module requirements change', presenter: 'Zhang Ming', outcome: 'Change management process initiated; the change request is to be submitted by next Wednesday.' },
    { topic: 'Supplier qualification issues', presenter: 'Wang Gang', outcome: 'Huaxin Technology must complete its certification by the deadline while the Dingxin Technology evaluation starts.' },
  ],
  keyDecisions: [
    { decision: 'Activate the backup supplier evaluation', decidedBy: 'Zhang Ming', rationale: 'Rising raw-material prices delay the second delivery by 2 weeks, so a backup plan is needed to bring the risk down.' },
    { decision: 'Stand up a minimal test environment', decidedBy: 'Zhang Ming', rationale: 'The equipment room upgrade is unfinished, so a minimal environment on the existing servers avoids blocking integration testing.' },
    { decision: 'Start the change management process', decidedBy: 'Zhang Ming', rationale: 'The client formally requested a new energy monitoring module; scope, cost, and schedule impact must be assessed before filing the change request.' },
    { decision: 'Start evaluating Dingxin Technology', decidedBy: 'Zhang Ming', rationale: 'Huaxin Technology\u2019s certification files are incomplete, so a third supplier is needed as backup.' },
  ],
  actionItems: [
    { id: 'mtg-new-001', type: 'new-task', title: 'Complete the backup supplier evaluation', description: 'Run qualification review and quote comparison for at least two backup suppliers and submit the evaluation report.', owner: 'Wang Gang', dueDate: '2026-08-28', source: 'Start backup supplier evaluation under Wang Gang, completing qualification review and quote comparison for at least two backup suppliers within this week.', subtasks: [
      { id: 'mtg-new-001-st-01', title: 'Collect backup supplier qualification files', owner: 'Wang Gang', dueDate: '2026-08-24' },
      { id: 'mtg-new-001-st-02', title: 'Run the quote comparison analysis', owner: 'Wang Gang', dueDate: '2026-08-26' },
      { id: 'mtg-new-001-st-03', title: 'Submit the supplier evaluation report', owner: 'Wang Gang', dueDate: '2026-08-28' },
    ] },
    { id: 'mtg-new-002', type: 'new-task', title: 'Stand up the minimal test environment', description: 'Set up a minimal usable environment on the existing test servers, prioritizing the security system integration test.', owner: 'Liu Yang', dueDate: '2026-08-25', source: 'Liu Yang owns standing up the minimal test environment within this week, prioritizing the security system integration test.', subtasks: [
      { id: 'mtg-new-002-st-01', title: 'Deploy the test server base environment', owner: 'Liu Yang', dueDate: '2026-08-23' },
      { id: 'mtg-new-002-st-02', title: 'Complete the security system integration dry run', owner: 'Liu Yang', dueDate: '2026-08-25' },
    ] },
    { id: 'mtg-new-003', type: 'new-task', title: 'Draft the change request and coordinate with the client', description: 'Discuss the energy monitoring module change scope, cost, and schedule impact with the client, then submit the change request.', owner: 'Zhang Ming', dueDate: '2026-09-02', source: 'Zhang Ming owns coordinating the change scope, cost, and schedule impact with the client and submitting the change request by next Wednesday.', subtasks: [
      { id: 'mtg-new-003-st-01', title: 'Estimate the change cost and schedule impact', owner: 'Zhang Ming', dueDate: '2026-08-27' },
      { id: 'mtg-new-003-st-02', title: 'Hold the change alignment meeting with the client', owner: 'Zhang Ming', dueDate: '2026-08-29' },
      { id: 'mtg-new-003-st-03', title: 'Submit the formal change request form', owner: 'Zhang Ming', dueDate: '2026-09-02' },
    ] },
    { id: 'mtg-new-004', type: 'new-task', title: 'Finalize the equipment selection proposal', description: 'Finalize the equipment selection proposal based on the review feedback.', owner: 'Zhao Xue', dueDate: '2026-08-28', source: 'Zhao Xue: finalize the equipment selection proposal \u2014 due August 28', subtasks: [
      { id: 'mtg-new-004-st-01', title: 'Consolidate review feedback and revise the proposal', owner: 'Zhao Xue', dueDate: '2026-08-26' },
      { id: 'mtg-new-004-st-02', title: 'Produce the final equipment selection proposal', owner: 'Zhao Xue', dueDate: '2026-08-28' },
    ] },
    { id: 'mtg-new-005', type: 'new-task', title: 'Prepare acceptance documentation templates', description: 'Kick off acceptance documentation work, preparing the templates and writing conventions.', owner: 'Chen Tao', dueDate: '2026-08-30', source: 'Chen Tao: prepare acceptance documentation templates \u2014 due August 30', subtasks: [
      { id: 'mtg-new-005-st-01', title: 'Define acceptance documentation writing conventions', owner: 'Chen Tao', dueDate: '2026-08-27' },
      { id: 'mtg-new-005-st-02', title: 'Produce the acceptance documentation templates', owner: 'Chen Tao', dueDate: '2026-08-30' },
    ] },
    { id: 'mtg-upd-001', type: 'update-task', title: 'Adjust the security camera delivery schedule', description: 'Due to supplier capacity constraints, the second batch delivery moves from early September to mid-September.', owner: 'Wang Gang', dueDate: '2026-09-15', relatedTaskId: 'demo-sub-001', source: 'The security camera supplier reported that rising raw-material prices could delay the second batch by about 2 weeks, with arrival expected in mid-September.', subtasks: [
      { id: 'mtg-upd-001-st-01', title: 'Confirm the new delivery plan with the supplier', owner: 'Wang Gang', dueDate: '2026-08-24' },
      { id: 'mtg-upd-001-st-02', title: 'Update the procurement task schedule', owner: 'Wang Gang', dueDate: '2026-08-25' },
    ] },
    { id: 'mtg-risk-001', type: 'new-risk', title: 'Procurement delay risk escalated', description: 'The security camera supplier has limited capacity and the second delivery slips by 2 weeks; the risk has been raised from medium to high.', owner: 'Wang Gang', dueDate: '2026-09-15', relatedTaskId: 'demo-sub-003', source: 'Procurement delay risk: escalated from medium to high; the backup plan is expected to ease it once active.', subtasks: [
      { id: 'mtg-risk-001-st-01', title: 'Register the escalation and notify stakeholders', owner: 'Wang Gang', dueDate: '2026-08-23' },
      { id: 'mtg-risk-001-st-02', title: 'Track the backup supplier onboarding', owner: 'Wang Gang', dueDate: '2026-09-15' },
    ] },
  ],
  stats: { newTasks: 5, updateTasks: 1, newRisks: 1 },
}

/** Complete Project Brain demo dataset for one locale. */
export interface ProjectBrainData {
  readonly plan: ProjectBrainPlanData
  readonly copilot: ProjectBrainCopilotData
  readonly myDay: ProjectBrainMyDayData
  readonly minutes: string
  readonly meetingAnalysis: ProjectBrainMeetingAnalysis
}

/** Module-level locale for the no-argument {@link resolveProjectBrainData} call; defaults to Chinese. */
let currentProjectBrainDataLocale: ProjectBrainLocale = 'zh'

/**
 * Set the module-level locale used by the no-argument {@link resolveProjectBrainData} call.
 * @param locale - target demo locale.
 */
export function setProjectBrainDataLocale(locale: ProjectBrainLocale): void {
  currentProjectBrainDataLocale = locale
}

/**
 * Select the complete Project Brain demo dataset for a locale.
 * @param locale - target locale; defaults to the module-level locale set by {@link setProjectBrainDataLocale}.
 * @returns the localized demo data collection.
 */
export function resolveProjectBrainData(locale: ProjectBrainLocale = currentProjectBrainDataLocale): ProjectBrainData {
  if (locale === 'zh') {
    return {
      plan: PROJECT_BRAIN_PLAN,
      copilot: PROJECT_BRAIN_COPILOT_DEMO,
      myDay: PROJECT_BRAIN_MY_DAY_DEMO,
      minutes: MEETING_MINUTES_TEXT,
      meetingAnalysis: MEETING_ANALYSIS_MOCK,
    }
  }
  return {
    plan: PROJECT_BRAIN_PLAN_EN,
    copilot: PROJECT_BRAIN_COPILOT_DEMO_EN,
    myDay: PROJECT_BRAIN_MY_DAY_DEMO_EN,
    minutes: MEETING_MINUTES_TEXT_EN,
    meetingAnalysis: MEETING_ANALYSIS_MOCK_EN,
  }
}
