/** Reproducible local-only account. Never reads production environment files. */
const postgres = require('postgres');
const bcrypt = require('bcryptjs');
const url = process.env.UX_REVIEW_DATABASE_URL || 'postgres://postgres:airunote_local_review@127.0.0.1:55434/airunote_ux_review';
const parsed = new URL(url);
if (parsed.hostname !== '127.0.0.1' || parsed.port !== '55434' || parsed.pathname !== '/airunote_ux_review') throw new Error('Refusing fixture outside named loopback review database');
const sql = postgres(url, { prepare: false });
const org = '10000000-0000-4000-8000-000000000028';
const user = '20000000-0000-4000-8000-000000000028';
const membership = '21000000-0000-4000-8000-000000000028';
const folder = n => `30000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const document = n => `40000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const lens = n => `50000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const stamp = '2026-10-28T04:00:00.000Z';
const planning = (kind = 'task', processed = true, plan = { kind: 'unplanned' }) => ({ version: 1, kind, status: 'open', processed, priority: false, plan, checklist: [], notes: [], source: null, history: [] });
async function main() {
  const hash = await bcrypt.hash('AirunoteLocal28!', 10);
  await sql.begin(async tx => {
    await tx`INSERT INTO orgs (id,name,slug,plan,subscription_status) VALUES (${org},'TheArchitectKing','local-ux-review','pro','active') ON CONFLICT (id) DO NOTHING`;
    await tx`INSERT INTO users (id,email,password_hash,name,default_org_id,email_verified_at) VALUES (${user},'review@airunote.local',${hash},'Arvin',${org},${stamp}) ON CONFLICT (id) DO UPDATE SET password_hash=${hash}`;
    await tx`INSERT INTO roles (id,name,code) VALUES (1,'Admin','ADMIN'),(2,'Member','MEMBER'),(3,'Viewer','VIEWER') ON CONFLICT DO NOTHING`;
    await tx`INSERT INTO org_users (id,org_id,user_id) VALUES (${membership},${org},${user}) ON CONFLICT DO NOTHING`;
    await tx`INSERT INTO org_user_roles (org_user_id,role_id) VALUES (${membership},1) ON CONFLICT DO NOTHING`;
    const folders = [
      [1,1,'__user_root__','box'], [2,1,'Book','book'], [3,1,'Lessons','book'], [4,1,'J Operating System v1','collection'], [5,1,'All','collection'],
      [6,2,'A','box'], [7,2,'C','box'], [8,2,'J','box'], [9,6,'Operations','box'], [10,9,'Our systems','project'], [11,9,'Where we are at','project'],
      [12,7,'Learning','project'], [13,7,'Delivery','box'], [14,13,'Product launch','project'], [15,8,'Everyday life','box'], [16,15,'Physical work','project'], [17,15,'Personal','project'],
    ];
    for (const [n,parent,name,type] of folders) await tx`INSERT INTO airu_folders (id,org_id,owner_user_id,parent_folder_id,human_id,type,metadata,created_at) VALUES (${folder(n)},${org},${user},${folder(parent)},${name},${type},'{}',${stamp}) ON CONFLICT (id) DO NOTHING`;
    await tx`INSERT INTO airu_user_roots (org_id,user_id,root_folder_id) VALUES (${org},${user},${folder(1)}) ON CONFLICT DO NOTHING`;
    const docs = [
      [1,2,'Earning Potential Setup','# Earning Potential Setup\n\nChoose one useful outcome. Break it into three clear steps.\n\n- Define the offer\n- Build the first example\n- Review progress', planning('task',false)],
      [2,2,'SAGEX test','# SAGEX test\n\nA local sample note for testing writing, planning, and navigation.',planning('task',false)],
      [3,14,'Architecture on the go','# Architecture on the go\n\n## Start with the problem\n\nSketch the boundaries. Identify inputs, outputs, and constraints before choosing technology.',planning('task',true,{kind:'day',date:'2026-10-28',time:'09:00',duration:60})],
      [4,16,'Prepare presentation','# Prepare presentation\n\nTell a clear story with three useful examples.',planning('task',true,{kind:'day',date:'2026-10-29',time:'10:00',duration:60})],
      [5,17,'We Are Love','# We Are Love\n\nMake time for what matters.',planning('note',true,{kind:'day',date:'2026-10-26',time:null,duration:null})],
      [6,1,'Today 28 October 2026 Wednesday','# Today\n\n- Review priorities\n- Finish one meaningful thing\n- Capture what you learn',planning('note')],
      [7,1,'Improvements','# Improvements\n\nMake the next step obvious. Keep the work readable.',planning('note')],
      [8,1,'New Document Test','# New Document Test\n\nA safe local document for smoke tests.',planning('note')],
      [9,1,'feel','# Feel\n\nAn ordinary note in the same connected workspace.',planning('note')],
      [10,1,'This is Great!','# This is Great!\n\nOne note, several useful ways to work.',planning('note')],
    ];
    // Keep the parameter typed as text so the driver does not JSON-encode it twice.
    for (const [n,parent,name,content,book] of docs) await tx`INSERT INTO airu_documents (id,folder_id,owner_user_id,type,name,content,canonical_content,attributes,created_at,updated_at) VALUES (${document(n)},${folder(parent)},${user},'MD',${name},${content},${content},${JSON.stringify({airunoteBook:book})}::text::jsonb,${stamp},${stamp}) ON CONFLICT (id) DO NOTHING`;
    const lenses = [[1,1,'Box','box'],[2,1,'Study','study'],[3,1,'Board','board'],[4,1,'Canvas','canvas'],[5,1,'Canvas','canvas'],[6,2,'Book','book']];
    for (const [n,parent,name,type] of lenses) await tx`INSERT INTO airu_lenses (id,folder_id,name,type,metadata,created_at,updated_at) VALUES (${lens(n)},${folder(parent)},${name},${type},'{}',${stamp},${stamp}) ON CONFLICT (id) DO NOTHING`;
    await tx`INSERT INTO exams (id,org_id,created_by_user_id,title,public_id) VALUES ('60000000-0000-4000-8000-000000000028',${org},${user},'Local regression exam','local-ux-regression') ON CONFLICT (id) DO NOTHING`;
    const publicExam = '60000000-0000-4000-8000-000000000029';
    await tx`INSERT INTO exams (id,org_id,created_by_user_id,title,description,status,public_id,prevent_focus_loss,review_mode,max_attempts) VALUES (${publicExam},${org},${user},'Local participant smoke exam','Two sample questions for verifying desktop and mobile answering. All attempts stay in the disposable local database.','published','local-ux-participant',false,'with_correct_answers',100) ON CONFLICT (id) DO NOTHING`;
    const choice = '61000000-0000-4000-8000-000000000001';
    const date = '61000000-0000-4000-8000-000000000002';
    const optionA = '62000000-0000-4000-8000-000000000001';
    const optionB = '62000000-0000-4000-8000-000000000002';
    await tx`INSERT INTO exam_questions (id,exam_id,type,prompt,position,correct_answers) VALUES (${choice},${publicExam},'single_choice','Which view helps you see work across a week?',0,${JSON.stringify([optionA])}::text::jsonb),(${date},${publicExam},'date','Choose the review date: 28 October 2026.',1,'["2026-10-28"]') ON CONFLICT (id) DO NOTHING`;
    await tx`INSERT INTO exam_question_options (id,question_id,label,position) VALUES (${optionA},${choice},'Calendar',0),(${optionB},${choice},'Document title',1) ON CONFLICT (id) DO NOTHING`;
  });
  console.log(JSON.stringify({orgId:org,userId:user,rootFolderId:folder(1),bookFolderId:folder(2),sampleDocumentId:document(2),login:{email:'review@airunote.local',password:'AirunoteLocal28!'},participantUrl:'http://localhost:4320/exam/local-ux-participant',database:'loopback review fixture only'}));
}
main().finally(() => sql.end()).catch(error => { console.error(error.message); process.exitCode = 1; });
