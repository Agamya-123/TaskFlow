'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface Project {
  id: string;
  name: string;
  description: string;
  owner?: {
    name: string;
    email: string;
  };
}

interface Task {
  id: string;
  title: string;
  description: string;
  status: string;
  dueDate: string | null;
  projectId: string;
  assigneeId: string | null;
  assignee?: {
    id: string;
    name: string;
    email: string;
  } | null;
  project?: {
    id: string;
    name: string;
  } | null;
}

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // State arrays
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Tab & Filters
  const [activeTab, setActiveTab] = useState<'overview' | 'projects' | 'tasks' | 'team'>('overview');
  const [selectedProjectFilter, setSelectedProjectFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals state
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // Form states
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    status: 'TODO',
    projectId: '',
    assigneeId: '',
    dueDate: '',
  });

  const [projectForm, setProjectForm] = useState({
    name: '',
    description: '',
  });

  // Load Data
  const fetchData = async () => {
    try {
      const [tasksRes, projectsRes, usersRes] = await Promise.all([
        fetch('/api/tasks'),
        fetch('/api/projects'),
        fetch('/api/users'),
      ]);

      if (tasksRes.status === 401 || projectsRes.status === 401 || usersRes.status === 401) {
        router.push('/login');
        return;
      }

      const tasksData = await tasksRes.json();
      const projectsData = await projectsRes.json();
      const usersData = await usersRes.json();

      setTasks(tasksData);
      setProjects(projectsData);
      setUsers(usersData);

      // Prepopulate taskForm project selection
      if (projectsData.length > 0) {
        setTaskForm((prev) => ({ ...prev, projectId: projectsData[0].id }));
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated') {
      fetchData();
    }
  }, [status]);

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-4 border-primary/20 animate-pulse"></div>
          <div className="absolute inset-0 rounded-full border-4 border-t-primary animate-spin"></div>
        </div>
        <p className="text-on-surface-variant font-label-md tracking-wider">Syncing workspaces...</p>
      </div>
    );
  }

  // Handle task creation
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskForm.title || !taskForm.projectId) return;

    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskForm),
      });
      if (res.ok) {
        const newTask = await res.json();
        setTasks((prev) => [newTask, ...prev]);
        setIsTaskModalOpen(false);
        setTaskForm({
          title: '',
          description: '',
          status: 'TODO',
          projectId: projects[0]?.id || '',
          assigneeId: '',
          dueDate: '',
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Handle project creation
  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectForm.name) return;

    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(projectForm),
      });
      if (res.ok) {
        const newProj = await res.json();
        setProjects((prev) => [newProj, ...prev]);
        setIsProjectModalOpen(false);
        setProjectForm({ name: '', description: '' });
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Update task status directly
  const handleUpdateStatus = async (taskId: string, newStatus: string) => {
    try {
      const res = await fetch('/api/tasks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: taskId, status: newStatus }),
      });
      if (res.ok) {
        const updatedTask = await res.json();
        setTasks((prev) => prev.map((t) => (t.id === taskId ? updatedTask : t)));
        if (selectedTask?.id === taskId) {
          setSelectedTask(updatedTask);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Update task assignee directly
  const handleUpdateAssignee = async (taskId: string, assigneeId: string) => {
    try {
      const res = await fetch('/api/tasks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: taskId, assigneeId }),
      });
      if (res.ok) {
        const updatedTask = await res.json();
        setTasks((prev) => prev.map((t) => (t.id === taskId ? updatedTask : t)));
        if (selectedTask?.id === taskId) {
          setSelectedTask(updatedTask);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Toggle user role (simulated dashboard action)
  const handleToggleUserRole = async (userId: string, currentRole: string) => {
    const nextRole = currentRole === 'ADMIN' ? 'MEMBER' : 'ADMIN';
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, role: nextRole } : u))
    );
  };

  // Filter Tasks
  const filteredTasks = tasks.filter((task) => {
    const matchesProject = selectedProjectFilter === 'all' || task.projectId === selectedProjectFilter;
    const matchesSearch =
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (task.description && task.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesProject && matchesSearch;
  });

  // Stats
  const statTotal = filteredTasks.length;
  const statTodo = filteredTasks.filter((t) => t.status === 'TODO').length;
  const statInProgress = filteredTasks.filter((t) => t.status === 'IN_PROGRESS').length;
  const statReview = filteredTasks.filter((t) => t.status === 'REVIEW').length;
  const statDone = filteredTasks.filter((t) => t.status === 'DONE').length;

  return (
    <div className="min-h-screen bg-background text-on-surface pb-32">
      {/* Top Bar */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-surface/80 backdrop-blur-xl border-b border-white/10 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg shadow-primary/20">
            <span className="material-symbols-outlined text-background font-bold text-xl">layers</span>
          </div>
          <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-primary via-secondary to-tertiary bg-clip-text text-transparent">TaskFlow AI</span>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface-container/60 border border-white/5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-xs text-on-surface-variant font-medium">Logged in as {session?.user?.name || 'User'}</span>
          </div>
          <button 
            onClick={() => signOut()}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-surface-variant/40 hover:bg-error/20 hover:text-error border border-white/5 transition-all text-xs font-semibold"
          >
            <span className="material-symbols-outlined text-sm">logout</span>
            Sign Out
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="mt-24 px-6 max-w-7xl mx-auto">
        {/* Navigation Tabs */}
        <div className="flex gap-2 p-1.5 bg-surface-container/40 backdrop-blur-md rounded-2xl border border-white/5 mb-8 overflow-x-auto w-fit max-w-full">
          {[
            { id: 'overview', label: 'Kanban Board', icon: 'dashboard' },
            { id: 'tasks', label: 'All Tasks', icon: 'assignment' },
            { id: 'projects', label: 'Projects', icon: 'folder_open' },
            { id: 'team', label: 'Team Space', icon: 'group' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-label-md text-sm transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-primary text-background font-bold shadow-md shadow-primary/20'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-variant/20'
              }`}
            >
              <span className="material-symbols-outlined text-lg">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Global Project & Search Filters */}
        <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center mb-8 bg-surface-container/20 p-4 rounded-2xl border border-white/5">
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <span className="text-sm font-semibold text-on-surface-variant flex items-center gap-1.5">
              <span className="material-symbols-outlined text-base">filter_list</span> Filter Project:
            </span>
            <select
              value={selectedProjectFilter}
              onChange={(e) => setSelectedProjectFilter(e.target.value)}
              className="bg-surface border border-white/10 rounded-xl px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-primary transition-colors cursor-pointer"
            >
              <option value="all">All Active Projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div className="relative w-full md:w-80">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 material-symbols-outlined text-on-surface-variant text-lg">search</span>
            <input
              type="text"
              placeholder="Search tasks by title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-surface border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary transition-colors"
            />
          </div>
        </div>

        {/* ==================== TAB: OVERVIEW / KANBAN ==================== */}
        {activeTab === 'overview' && (
          <div className="flex flex-col gap-8 animate-fade-in">
            {/* Stats Summary Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Todo Tasks', value: statTodo, icon: 'list_alt', color: 'text-tertiary', bg: 'bg-tertiary/10', border: 'border-tertiary/20' },
                { label: 'In Progress', value: statInProgress, icon: 'trending_up', color: 'text-secondary', bg: 'bg-secondary/10', border: 'border-secondary/20' },
                { label: 'In Review', value: statReview, icon: 'rate_review', color: 'text-primary', bg: 'bg-primary/10', border: 'border-primary/20' },
                { label: 'Completed', value: statDone, icon: 'check_circle', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
              ].map((stat, i) => (
                <div key={i} className={`glass-card p-5 rounded-2xl border ${stat.border} flex items-center justify-between`}>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-on-surface-variant font-medium uppercase tracking-wider">{stat.label}</span>
                    <span className="text-3xl font-bold font-display">{stat.value}</span>
                  </div>
                  <div className={`w-12 h-12 rounded-xl ${stat.bg} flex items-center justify-center ${stat.color}`}>
                    <span className="material-symbols-outlined text-2xl">{stat.icon}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Kanban Columns */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { id: 'TODO', title: 'To Do', color: 'border-tertiary/40 text-tertiary', badge: 'bg-tertiary/20' },
                { id: 'IN_PROGRESS', title: 'In Progress', color: 'border-secondary/40 text-secondary', badge: 'bg-secondary/20' },
                { id: 'REVIEW', title: 'Under Review', color: 'border-primary/40 text-primary', badge: 'bg-primary/20' },
                { id: 'DONE', title: 'Completed', color: 'border-emerald-500/40 text-emerald-400', badge: 'bg-emerald-500/20' },
              ].map((column) => {
                const columnTasks = filteredTasks.filter((t) => t.status === column.id);
                return (
                  <div key={column.id} className="flex flex-col gap-4 bg-surface-container/20 rounded-2xl border border-white/5 p-4 min-h-[500px]">
                    <div className="flex justify-between items-center pb-2 border-b border-white/5">
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${column.id === 'TODO' ? 'bg-tertiary' : column.id === 'IN_PROGRESS' ? 'bg-secondary' : column.id === 'REVIEW' ? 'bg-primary' : 'bg-emerald-500'}`}></span>
                        <h3 className="font-bold text-sm tracking-wide uppercase text-on-surface">{column.title}</h3>
                      </div>
                      <span className={`px-2 py-0.5 rounded-md text-xs font-bold ${column.badge} ${column.color.split(' ')[1]}`}>
                        {columnTasks.length}
                      </span>
                    </div>

                    <div className="flex flex-col gap-3 overflow-y-auto max-h-[600px] pr-1">
                      {columnTasks.length === 0 ? (
                        <div className="text-center py-8 text-xs text-on-surface-variant/40 border border-dashed border-white/5 rounded-xl">
                          No tasks here
                        </div>
                      ) : (
                        columnTasks.map((task) => (
                          <div
                            key={task.id}
                            onClick={() => {
                              setSelectedTask(task);
                              setIsDetailModalOpen(true);
                            }}
                            className="glass-card p-4 rounded-xl border border-white/5 hover:border-white/20 transition-all cursor-pointer group flex flex-col gap-3 relative overflow-hidden active:scale-[0.98]"
                          >
                            <h4 className="font-bold text-sm text-on-surface group-hover:text-primary transition-colors line-clamp-1">{task.title}</h4>
                            <p className="text-xs text-on-surface-variant line-clamp-2 leading-relaxed">{task.description || 'No description provided'}</p>
                            
                            <div className="flex justify-between items-center pt-2 border-t border-white/5 text-[11px] text-on-surface-variant">
                              <span className="flex items-center gap-1">
                                <span className="material-symbols-outlined text-[12px]">folder</span>
                                {task.project?.name || 'Project'}
                              </span>
                              
                              <div className="flex items-center gap-1.5">
                                <div className="w-5 h-5 rounded-full bg-surface-variant/80 flex items-center justify-center text-[9px] font-bold border border-white/10 uppercase" title={task.assignee?.name}>
                                  {task.assignee?.name?.substring(0, 2) || 'UN'}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    <button
                      onClick={() => {
                        setTaskForm((prev) => ({ ...prev, status: column.id }));
                        setIsTaskModalOpen(true);
                      }}
                      className="mt-auto flex items-center justify-center gap-2 py-2.5 border border-dashed border-white/10 hover:border-primary/40 rounded-xl text-xs text-on-surface-variant hover:text-primary transition-all group"
                    >
                      <span className="material-symbols-outlined text-sm group-hover:rotate-90 transition-transform">add</span>
                      Quick Add Task
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ==================== TAB: ALL TASKS LIST ==================== */}
        {activeTab === 'tasks' && (
          <div className="glass-card rounded-2xl border border-white/5 overflow-hidden animate-fade-in">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container/60 border-b border-white/10 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
                    <th className="p-4 pl-6">Task Title</th>
                    <th className="p-4">Project</th>
                    <th className="p-4">Assignee</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Due Date</th>
                    <th className="p-4 text-right pr-6">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-sm">
                  {filteredTasks.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-on-surface-variant/50">
                        No tasks found matching current filters.
                      </td>
                    </tr>
                  ) : (
                    filteredTasks.map((task) => (
                      <tr key={task.id} className="hover:bg-surface-container/20 transition-colors">
                        <td className="p-4 pl-6 font-semibold">
                          <button
                            onClick={() => {
                              setSelectedTask(task);
                              setIsDetailModalOpen(true);
                            }}
                            className="hover:text-primary transition-colors text-left"
                          >
                            {task.title}
                          </button>
                        </td>
                        <td className="p-4 text-on-surface-variant">
                          <span className="flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-base">folder</span>
                            {task.project?.name}
                          </span>
                        </td>
                        <td className="p-4">
                          <select
                            value={task.assigneeId || ''}
                            onChange={(e) => handleUpdateAssignee(task.id, e.target.value)}
                            className="bg-surface border border-white/5 rounded-lg px-2 py-1 text-xs text-on-surface focus:outline-none focus:border-primary cursor-pointer"
                          >
                            <option value="">Unassigned</option>
                            {users.map((u) => (
                              <option key={u.id} value={u.id}>{u.name}</option>
                            ))}
                          </select>
                        </td>
                        <td className="p-4">
                          <select
                            value={task.status}
                            onChange={(e) => handleUpdateStatus(task.id, e.target.value)}
                            className={`border border-white/5 rounded-lg px-2.5 py-1 text-xs font-semibold focus:outline-none cursor-pointer ${
                              task.status === 'TODO' ? 'bg-tertiary/10 text-tertiary' :
                              task.status === 'IN_PROGRESS' ? 'bg-secondary/10 text-secondary' :
                              task.status === 'REVIEW' ? 'bg-primary/10 text-primary' :
                              'bg-emerald-500/10 text-emerald-400'
                            }`}
                          >
                            <option value="TODO">To Do</option>
                            <option value="IN_PROGRESS">In Progress</option>
                            <option value="REVIEW">Review</option>
                            <option value="DONE">Completed</option>
                          </select>
                        </td>
                        <td className="p-4 text-on-surface-variant">
                          {task.dueDate ? new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'No Date'}
                        </td>
                        <td className="p-4 text-right pr-6">
                          <button
                            onClick={() => {
                              setSelectedTask(task);
                              setIsDetailModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg hover:bg-surface-variant/40 text-on-surface-variant hover:text-primary transition-all"
                          >
                            <span className="material-symbols-outlined text-base">edit</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ==================== TAB: PROJECTS LIST ==================== */}
        {activeTab === 'projects' && (
          <div className="flex flex-col gap-6 animate-fade-in">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold">Active Projects ({projects.length})</h2>
              <button
                onClick={() => setIsProjectModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary to-secondary text-background font-bold rounded-xl shadow-lg hover:shadow-primary/30 transition-all text-sm active:scale-95"
              >
                <span className="material-symbols-outlined text-lg">add</span> Create Project
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((project) => {
                const projectTasks = tasks.filter((t) => t.projectId === project.id);
                const completedTasks = projectTasks.filter((t) => t.status === 'DONE').length;
                const progressPercent = projectTasks.length > 0 ? Math.round((completedTasks / projectTasks.length) * 100) : 0;

                return (
                  <div key={project.id} className="glass-card p-6 rounded-2xl border border-white/5 hover:border-white/10 transition-all flex flex-col gap-4">
                    <div className="flex items-start justify-between">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                        <span className="material-symbols-outlined">folder</span>
                      </div>
                      <span className="text-xs text-on-surface-variant/70 font-semibold bg-surface-container/60 px-2.5 py-1 rounded-lg">
                        {projectTasks.length} {projectTasks.length === 1 ? 'task' : 'tasks'}
                      </span>
                    </div>

                    <div>
                      <h3 className="font-bold text-base text-on-surface mb-1">{project.name}</h3>
                      <p className="text-xs text-on-surface-variant line-clamp-2 leading-relaxed">{project.description || 'No description provided'}</p>
                    </div>

                    <div className="mt-2 pt-4 border-t border-white/5 flex flex-col gap-2">
                      <div className="flex justify-between text-xs font-semibold text-on-surface-variant">
                        <span>Project Completion</span>
                        <span>{progressPercent}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-surface-container rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-500" style={{ width: `${progressPercent}%` }}></div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ==================== TAB: TEAM MEMBERS ==================== */}
        {activeTab === 'team' && (
          <div className="flex flex-col gap-6 animate-fade-in">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold">Team Workspace ({users.length})</h2>
                <p className="text-xs text-on-surface-variant mt-0.5">Invite developers and manage roles</p>
              </div>
              <button
                onClick={() => {
                  const name = prompt('Enter Member Name:');
                  if (!name) return;
                  const email = prompt('Enter Member Email:');
                  if (!email) return;
                  const newUser: User = {
                    id: Math.random().toString(),
                    name,
                    email,
                    role: 'MEMBER',
                  };
                  setUsers((prev) => [...prev, newUser]);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary to-secondary text-background font-bold rounded-xl shadow-lg hover:shadow-primary/30 transition-all text-sm active:scale-95"
              >
                <span className="material-symbols-outlined text-lg">person_add</span> Invite Member
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {users.map((member) => (
                <div key={member.id} className="glass-card p-5 rounded-2xl border border-white/5 hover:border-white/10 transition-all flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center font-bold text-lg text-primary border border-white/10 uppercase">
                    {member.name.substring(0, 2)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-sm text-on-surface truncate">{member.name}</h3>
                    <p className="text-xs text-on-surface-variant truncate">{member.email}</p>
                  </div>

                  <div className="flex flex-col items-end gap-1.5">
                    <button
                      onClick={() => handleToggleUserRole(member.id, member.role)}
                      className={`px-3 py-1 rounded-xl text-[10px] font-bold tracking-wider uppercase transition-colors border ${
                        member.role === 'ADMIN'
                          ? 'bg-primary/10 text-primary border-primary/20 hover:bg-primary/20'
                          : 'bg-surface-variant/40 text-on-surface-variant border-white/5 hover:bg-surface-variant/60'
                      }`}
                    >
                      {member.role}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Floating Action Button */}
      <button
        onClick={() => {
          setTaskForm((prev) => ({ ...prev, status: 'TODO' }));
          setIsTaskModalOpen(true);
        }}
        className="fixed right-6 bottom-6 w-14 h-14 bg-gradient-to-r from-primary to-secondary text-background rounded-2xl flex items-center justify-center shadow-lg shadow-primary/30 hover:scale-110 active:scale-95 transition-all z-30 group"
      >
        <span className="material-symbols-outlined text-3xl font-bold transition-transform group-hover:rotate-90">add</span>
      </button>

      {/* ==================== MODAL: CREATE TASK ==================== */}
      {isTaskModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-fade-in">
          <div className="glass-card w-full max-w-lg rounded-2xl border border-white/10 p-6 shadow-2xl relative">
            <button
              onClick={() => setIsTaskModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-white/10 text-on-surface-variant hover:text-on-surface transition-colors"
            >
              <span className="material-symbols-outlined">close</span>
            </button>

            <h3 className="text-lg font-bold mb-5 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">add_task</span> Add New Task
            </h3>

            <form onSubmit={handleCreateTask} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-on-surface-variant">Task Title</label>
                <input
                  type="text"
                  required
                  placeholder="What needs to be done?"
                  value={taskForm.title}
                  onChange={(e) => setTaskForm((prev) => ({ ...prev, title: e.target.value }))}
                  className="bg-surface border border-white/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-primary text-on-surface placeholder:text-on-surface-variant/40"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-on-surface-variant">Description</label>
                <textarea
                  placeholder="Describe the goals or context..."
                  value={taskForm.description}
                  onChange={(e) => setTaskForm((prev) => ({ ...prev, description: e.target.value }))}
                  className="bg-surface border border-white/10 rounded-xl px-3 py-2.5 text-sm h-24 focus:outline-none focus:border-primary text-on-surface placeholder:text-on-surface-variant/40 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-on-surface-variant">Project</label>
                  <select
                    value={taskForm.projectId}
                    onChange={(e) => setTaskForm((prev) => ({ ...prev, projectId: e.target.value }))}
                    className="bg-surface border border-white/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-primary text-on-surface"
                  >
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-on-surface-variant">Assignee</label>
                  <select
                    value={taskForm.assigneeId}
                    onChange={(e) => setTaskForm((prev) => ({ ...prev, assigneeId: e.target.value }))}
                    className="bg-surface border border-white/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-primary text-on-surface"
                  >
                    <option value="">Select Developer</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-on-surface-variant">Status</label>
                  <select
                    value={taskForm.status}
                    onChange={(e) => setTaskForm((prev) => ({ ...prev, status: e.target.value }))}
                    className="bg-surface border border-white/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-primary text-on-surface"
                  >
                    <option value="TODO">To Do</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="REVIEW">Review</option>
                    <option value="DONE">Completed</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-on-surface-variant">Due Date</label>
                  <input
                    type="date"
                    value={taskForm.dueDate}
                    onChange={(e) => setTaskForm((prev) => ({ ...prev, dueDate: e.target.value }))}
                    className="bg-surface border border-white/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-primary text-on-surface"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="mt-4 bg-gradient-to-r from-primary to-secondary text-background font-bold py-3 rounded-xl hover:opacity-90 active:scale-95 transition-all text-sm"
              >
                Create Task
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ==================== MODAL: CREATE PROJECT ==================== */}
      {isProjectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-fade-in">
          <div className="glass-card w-full max-w-md rounded-2xl border border-white/10 p-6 shadow-2xl relative">
            <button
              onClick={() => setIsProjectModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-white/10 text-on-surface-variant hover:text-on-surface transition-colors"
            >
              <span className="material-symbols-outlined">close</span>
            </button>

            <h3 className="text-lg font-bold mb-5 flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary">create_new_folder</span> Create Project
            </h3>

            <form onSubmit={handleCreateProject} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-on-surface-variant">Project Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mobile Application v2"
                  value={projectForm.name}
                  onChange={(e) => setProjectForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="bg-surface border border-white/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-primary text-on-surface placeholder:text-on-surface-variant/40"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-on-surface-variant">Description</label>
                <textarea
                  placeholder="Brief summary of the goals or scope..."
                  value={projectForm.description}
                  onChange={(e) => setProjectForm((prev) => ({ ...prev, description: e.target.value }))}
                  className="bg-surface border border-white/10 rounded-xl px-3 py-2.5 text-sm h-24 focus:outline-none focus:border-primary text-on-surface placeholder:text-on-surface-variant/40 resize-none"
                />
              </div>

              <button
                type="submit"
                className="mt-4 bg-gradient-to-r from-primary to-secondary text-background font-bold py-3 rounded-xl hover:opacity-90 active:scale-95 transition-all text-sm"
              >
                Create Project
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ==================== MODAL: TASK DETAIL VIEW ==================== */}
      {isDetailModalOpen && selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-fade-in">
          <div className="glass-card w-full max-w-lg rounded-2xl border border-white/10 p-6 shadow-2xl relative flex flex-col gap-5">
            <button
              onClick={() => setIsDetailModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-white/10 text-on-surface-variant hover:text-on-surface transition-colors"
            >
              <span className="material-symbols-outlined">close</span>
            </button>

            <div>
              <span className="text-[10px] font-bold tracking-widest bg-primary/10 text-primary border border-primary/20 px-2.5 py-1 rounded-md uppercase">
                {selectedTask.project?.name}
              </span>
              <h3 className="text-xl font-bold mt-3 text-on-surface">{selectedTask.title}</h3>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-on-surface-variant">Description</span>
              <div className="bg-surface-container/40 p-4 rounded-xl border border-white/5 text-sm leading-relaxed text-on-surface">
                {selectedTask.description || 'No description provided.'}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 border-t border-b border-white/5 py-4 my-2">
              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-semibold text-on-surface-variant uppercase">Assignee</span>
                <select
                  value={selectedTask.assigneeId || ''}
                  onChange={(e) => handleUpdateAssignee(selectedTask.id, e.target.value)}
                  className="bg-surface border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-on-surface focus:outline-none focus:border-primary cursor-pointer w-full"
                >
                  <option value="">Unassigned</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-semibold text-on-surface-variant uppercase">Status</span>
                <select
                  value={selectedTask.status}
                  onChange={(e) => handleUpdateStatus(selectedTask.id, e.target.value)}
                  className={`border border-white/10 rounded-lg px-2.5 py-1.5 text-xs font-semibold focus:outline-none cursor-pointer w-full ${
                    selectedTask.status === 'TODO' ? 'bg-tertiary/10 text-tertiary' :
                    selectedTask.status === 'IN_PROGRESS' ? 'bg-secondary/10 text-secondary' :
                    selectedTask.status === 'REVIEW' ? 'bg-primary/10 text-primary' :
                    'bg-emerald-500/10 text-emerald-400'
                  }`}
                >
                  <option value="TODO">To Do</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="REVIEW">Review</option>
                  <option value="DONE">Completed</option>
                </select>
              </div>
            </div>

            <div className="flex justify-between items-center text-xs text-on-surface-variant">
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">calendar_today</span>
                Due: {selectedTask.dueDate ? new Date(selectedTask.dueDate).toLocaleDateString() : 'No date set'}
              </span>

              <button
                onClick={async () => {
                  if (confirm('Are you sure you want to delete this task?')) {
                    try {
                      await fetch(`/api/tasks`, {
                        method: 'DELETE',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ id: selectedTask.id }),
                      });
                      setTasks((prev) => prev.filter((t) => t.id !== selectedTask.id));
                      setIsDetailModalOpen(false);
                    } catch (err) {
                      console.error(err);
                    }
                  }
                }}
                className="flex items-center gap-1.5 text-error hover:text-red-400 font-semibold px-3 py-1.5 rounded-lg hover:bg-error/10 transition-colors"
              >
                <span className="material-symbols-outlined text-base">delete</span>
                Delete Task
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
