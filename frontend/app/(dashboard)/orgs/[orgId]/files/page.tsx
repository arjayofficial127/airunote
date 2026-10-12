import { AdminWorkspace } from '@/components/exams/AdminWorkspace';
import { NativeFileLibrary } from '@/components/files/NativeFileLibrary';
export default function FilesPage(){return <AdminWorkspace current="Files"><div className="mx-auto max-w-6xl p-6 sm:p-10"><NativeFileLibrary /></div></AdminWorkspace>;}
