'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Pusher from 'pusher-js';

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

interface Subtask {
  id: string;
  title: string;
  isCompleted: boolean;
  taskId: string;
  createdAt: string;
  updatedAt: string;
}

interface Task {
  id: string;
  title: string;
  description: string;
  status: string;
  dueDate: string | null;
  projectId: string;
  assigneeId: string | null;
  priority: string;
  tags: string[];
  subtasks?: Subtask[];
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

  // Role extraction
  const userRole = (session?.user as any)?.role || 'MEMBER';
  const isAdmin = userRole === 'ADMIN';
  const currentUserId = (session?.user as any)?.id;

  // Theme support
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  // State arrays
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Tab & Filters
  const [activeTab, setActiveTab] = useState<'overview' | 'tasks' | 'analytics' | 'projects' | 'team'>('overview');
  const [selectedProjectFilter, setSelectedProjectFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Member tasks filter toggler: defaults to only showing user's assigned tasks
  const [memberViewFilter, setMemberViewFilter] = useState<'my' | 'all'>('my');

  // Modals state
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState<string>('');
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportText, setReportText] = useState('');
  const [generatingReport, setGeneratingReport] = useState(false);
  const [breakingDownTask, setBreakingDownTask] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [newCommentText, setNewCommentText] = useState<string>('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [loadingCommentsActivities, setLoadingCommentsActivities] = useState(false);
  const [detailActiveTab, setDetailActiveTab] = useState<'comments' | 'activities'>('comments');
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [mentionSearchQuery, setMentionSearchQuery] = useState('');
  const [mentionDropdownIndex, setMentionDropdownIndex] = useState(0);
  const [mentionTriggerIndex, setMentionTriggerIndex] = useState(-1);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [activeToast, setActiveToast] = useState<{ message: string; visible: boolean }>({ message: '', visible: false });

  // Form states
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    status: 'TODO',
    projectId: '',
    assigneeId: '',
    dueDate: '',
    priority: 'MEDIUM',
    tagsString: '',
  });

  const [projectForm, setProjectForm] = useState({
    name: '',
    description: '',
  });

  const [inviteForm, setInviteForm] = useState({
    name: '',
    email: '',
    role: 'MEMBER',
  });

  // Theme Sync on Mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'dark' | 'light' | null;
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.className = savedTheme;
    } else {
      document.documentElement.className = 'dark';
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('theme', nextTheme);
    document.documentElement.className = nextTheme;
  };

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

  // Fetch comments and activities when a task is opened
  useEffect(() => {
    if (selectedTask?.id) {
      const fetchCommentsAndActivities = async () => {
        setLoadingCommentsActivities(true);
        try {
          const [commentsRes, activitiesRes] = await Promise.all([
            fetch(`/api/comments?taskId=${selectedTask.id}`),
            fetch(`/api/activities?taskId=${selectedTask.id}`),
          ]);
          if (commentsRes.ok && activitiesRes.ok) {
            const commentsData = await commentsRes.json();
            const activitiesData = await activitiesRes.json();
            setComments(commentsData);
            setActivities(activitiesData);
          }
        } catch (err) {
          console.error('Failed to fetch comments or activities:', err);
        } finally {
          setLoadingCommentsActivities(false);
        }
      };
      fetchCommentsAndActivities();
    } else {
      setComments([]);
      setActivities([]);
    }
  }, [selectedTask?.id]);

  const playNotificationSound = () => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, ctx.currentTime);
      osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1);
      
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } catch (err) {
      console.error('Audio play failed:', err);
    }
  };

  const showToastNotification = (msg: string) => {
    setActiveToast({ message: msg, visible: true });
    setTimeout(() => {
      setActiveToast((prev) => ({ ...prev, visible: false }));
    }, 4500);
  };

  // Listen to real-time events via Pusher client
  useEffect(() => {
    const pusherKey = process.env.NEXT_PUBLIC_PUSHER_KEY;
    const pusherCluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;
    
    if (!pusherKey || !pusherCluster) return;

    const pusher = new Pusher(pusherKey, {
      cluster: pusherCluster,
    });

    const boardChannel = pusher.subscribe('task-board');
    boardChannel.bind('task-updated', (data: { taskId: string; task: Task }) => {
      setTasks((prev) =>
        prev.map((t) => (t.id === data.taskId ? { ...t, ...data.task } : t))
      );
      if (selectedTask?.id === data.taskId) {
        setSelectedTask((prev) => (prev ? { ...prev, ...data.task } : null));
      }
    });

    const collabChannel = pusher.subscribe('task-collaboration');
    collabChannel.bind('comment-added', (data: { taskId: string; comment: any }) => {
      if (selectedTask?.id === data.taskId) {
        setComments((prev) => {
          if (prev.some((c) => c.id === data.comment.id)) return prev;
          return [...prev, data.comment];
        });
        // Re-fetch activities
        fetch(`/api/activities?taskId=${data.taskId}`)
          .then((res) => res.json())
          .then((actData) => setActivities(actData))
          .catch((err) => console.error(err));
      }

      // Check for mention ping notification
      const currentUserName = session?.user?.name;
      if (
        currentUserName && 
        data.comment.content.includes(`@${currentUserName}`) && 
        data.comment.userId !== currentUserId
      ) {
        playNotificationSound();
        showToastNotification(`You were mentioned by ${data.comment.user.name || 'a team member'} in a comment.`);
      }
    });

    return () => {
      boardChannel.unbind_all();
      collabChannel.unbind_all();
      pusher.unsubscribe('task-board');
      pusher.unsubscribe('task-collaboration');
      pusher.disconnect();
    };
  }, [selectedTask?.id]);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const dropdown = document.getElementById('mention-dropdown');
      const input = document.getElementById('comment-input');
      if (
        dropdown && 
        !dropdown.contains(e.target as Node) && 
        input && 
        !input.contains(e.target as Node)
      ) {
        setShowMentionDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-4 border-primary/20 animate-pulse"></div>
          <div className="absolute inset-0 rounded-full border-4 border-t-primary animate-spin"></div>
        </div>
        <p className="text-on-surface-variant font-label-md tracking-wider">Syncing workspace...</p>
      </div>
    );
  }

  // Handle task creation
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return; // Role Check
    if (!taskForm.title || !taskForm.projectId) return;

    const tags = taskForm.tagsString
      ? taskForm.tagsString.split(',').map((t) => t.trim()).filter(Boolean)
      : [];

    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...taskForm,
          tags,
        }),
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
          priority: 'MEDIUM',
          tagsString: '',
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Handle project creation
  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return; // Role Check
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

  // Invite member via API
  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return; // Role Check
    if (!inviteForm.name || !inviteForm.email) return;

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inviteForm),
      });
      if (res.ok) {
        const newUser = await res.json();
        setUsers((prev) => [...prev, newUser]);
        setIsInviteModalOpen(false);
        setInviteForm({ name: '', email: '', role: 'MEMBER' });
      } else {
        const errData = await res.json();
        alert(errData.error || 'Failed to invite team member');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Update task status directly (with optimistic updates for instant drag-and-drop feedback)
  const handleUpdateStatus = async (taskId: string, newStatus: string) => {
    const targetTask = tasks.find(t => t.id === taskId);
    if (!targetTask) return;

    // If Member, enforce that they can only modify status for tasks assigned to them
    if (!isAdmin && targetTask.assigneeId !== currentUserId) {
      alert("Permission denied. You can only edit the status of tasks assigned to you.");
      return;
    }

    const originalStatus = targetTask.status;

    // 1. Optimistic Update: instantly update the local state to move the card
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
    );
    if (selectedTask?.id === taskId) {
      setSelectedTask((prev) => (prev ? { ...prev, status: newStatus } : null));
    }

    try {
      const res = await fetch('/api/tasks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: taskId, status: newStatus }),
      });

      if (!res.ok) {
        throw new Error('Failed to update status on server');
      }

      const updatedTask = await res.json();
      // Synchronize final server response state
      setTasks((prev) => prev.map((t) => (t.id === taskId ? updatedTask : t)));
      if (selectedTask?.id === taskId) {
        setSelectedTask(updatedTask);
      }
    } catch (err) {
      console.error(err);
      // 2. Rollback to original status on failure
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: originalStatus } : t))
      );
      if (selectedTask?.id === taskId) {
        setSelectedTask((prev) => (prev ? { ...prev, status: originalStatus } : null));
      }
      alert('Error updating task status. Rollback executed.');
    }
  };

  // Update task assignee directly (Admin only)
  const handleUpdateAssignee = async (taskId: string, assigneeId: string) => {
    if (!isAdmin) return; // Role Check
    const targetTask = tasks.find(t => t.id === taskId);
    if (!targetTask) return;

    const originalAssigneeId = targetTask.assigneeId;
    const targetAssignee = users.find(u => u.id === assigneeId) || null;

    // 1. Optimistic Update
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              assigneeId,
              assignee: targetAssignee
                ? { id: targetAssignee.id, name: targetAssignee.name, email: targetAssignee.email }
                : null,
            }
          : t
      )
    );
    if (selectedTask?.id === taskId) {
      setSelectedTask((prev) =>
        prev
          ? {
              ...prev,
              assigneeId,
              assignee: targetAssignee
                ? { id: targetAssignee.id, name: targetAssignee.name, email: targetAssignee.email }
                : null,
            }
          : null
      );
    }

    try {
      const res = await fetch('/api/tasks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: taskId, assigneeId }),
      });

      if (!res.ok) {
        throw new Error('Failed to update assignee');
      }

      const updatedTask = await res.json();
      setTasks((prev) => prev.map((t) => (t.id === taskId ? updatedTask : t)));
      if (selectedTask?.id === taskId) {
        setSelectedTask(updatedTask);
      }
    } catch (err) {
      console.error(err);
      // Rollback
      const originalAssignee = targetTask.assignee || null;
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId
            ? { ...t, assigneeId: originalAssigneeId, assignee: originalAssignee }
            : t
        )
      );
      if (selectedTask?.id === taskId) {
        setSelectedTask((prev) =>
          prev ? { ...prev, assigneeId: originalAssigneeId, assignee: originalAssignee } : null
        );
      }
      alert('Error updating task assignee. Rollback executed.');
    }
  };

  // Update task priority directly
  const handleUpdatePriority = async (taskId: string, priority: string) => {
    const targetTask = tasks.find(t => t.id === taskId);
    if (!targetTask) return;
    if (!isAdmin && targetTask.assigneeId !== currentUserId) {
      alert("Permission denied. You can only edit tasks assigned to you.");
      return;
    }

    const originalPriority = targetTask.priority;

    // 1. Optimistic Update
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, priority } : t))
    );
    if (selectedTask?.id === taskId) {
      setSelectedTask((prev) => (prev ? { ...prev, priority } : null));
    }

    try {
      const res = await fetch('/api/tasks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: taskId, priority }),
      });

      if (!res.ok) {
        throw new Error('Failed to update priority');
      }

      const updatedTask = await res.json();
      setTasks((prev) => prev.map((t) => (t.id === taskId ? updatedTask : t)));
      if (selectedTask?.id === taskId) {
        setSelectedTask(updatedTask);
      }
    } catch (err) {
      console.error(err);
      // Rollback
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, priority: originalPriority } : t))
      );
      if (selectedTask?.id === taskId) {
        setSelectedTask((prev) => (prev ? { ...prev, priority: originalPriority } : null));
      }
      alert('Error updating task priority. Rollback executed.');
    }
  };

  // Update task tags directly
  const handleUpdateTags = async (taskId: string, tags: string[]) => {
    const targetTask = tasks.find(t => t.id === taskId);
    if (!targetTask) return;
    if (!isAdmin && targetTask.assigneeId !== currentUserId) {
      alert("Permission denied. You can only edit tasks assigned to you.");
      return;
    }

    const originalTags = targetTask.tags || [];

    // 1. Optimistic Update
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, tags } : t))
    );
    if (selectedTask?.id === taskId) {
      setSelectedTask((prev) => (prev ? { ...prev, tags } : null));
    }

    try {
      const res = await fetch('/api/tasks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: taskId, tags }),
      });

      if (!res.ok) {
        throw new Error('Failed to update tags');
      }

      const updatedTask = await res.json();
      setTasks((prev) => prev.map((t) => (t.id === taskId ? updatedTask : t)));
      if (selectedTask?.id === taskId) {
        setSelectedTask(updatedTask);
      }
    } catch (err) {
      console.error(err);
      // Rollback
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, tags: originalTags } : t))
      );
      if (selectedTask?.id === taskId) {
        setSelectedTask((prev) => (prev ? { ...prev, tags: originalTags } : null));
      }
      alert('Error updating task tags. Rollback executed.');
    }
  };

  // Sync subtasks array directly
  const handleSyncSubtasks = async (taskId: string, subtasks: any[]) => {
    const targetTask = tasks.find(t => t.id === taskId);
    if (!targetTask) return;
    if (!isAdmin && targetTask.assigneeId !== currentUserId) {
      alert("Permission denied. You can only edit tasks assigned to you.");
      return;
    }

    const originalSubtasks = targetTask.subtasks || [];

    // 1. Optimistic Update
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, subtasks } : t))
    );
    if (selectedTask?.id === taskId) {
      setSelectedTask((prev) => (prev ? { ...prev, subtasks } : null));
    }

    try {
      const res = await fetch('/api/tasks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: taskId, subtasks }),
      });

      if (!res.ok) {
        throw new Error('Failed to sync subtasks');
      }

      const updatedTask = await res.json();
      setTasks((prev) => prev.map((t) => (t.id === taskId ? updatedTask : t)));
      if (selectedTask?.id === taskId) {
        setSelectedTask(updatedTask);
      }
    } catch (err) {
      console.error(err);
      // Rollback
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, subtasks: originalSubtasks } : t))
      );
      if (selectedTask?.id === taskId) {
        setSelectedTask((prev) => (prev ? { ...prev, subtasks: originalSubtasks } : null));
      }
      alert('Error updating checklist. Rollback executed.');
    }
  };

  const toggleSubtask = (subtaskId: string) => {
    if (!selectedTask) return;
    const updatedSubtasks = selectedTask.subtasks?.map(s => 
      s.id === subtaskId ? { ...s, isCompleted: !s.isCompleted } : s
    ) || [];
    handleSyncSubtasks(selectedTask.id, updatedSubtasks);
  };

  const addSubtask = () => {
    if (!selectedTask || !newSubtaskTitle.trim()) return;
    const newSubtask = { 
      id: `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      title: newSubtaskTitle.trim(), 
      isCompleted: false 
    };
    const updatedSubtasks = [...(selectedTask.subtasks || []), newSubtask];
    handleSyncSubtasks(selectedTask.id, updatedSubtasks);
    setNewSubtaskTitle('');
  };

  const deleteSubtask = (subtaskId: string) => {
    if (!selectedTask) return;
    const updatedSubtasks = selectedTask.subtasks?.filter(s => s.id !== subtaskId) || [];
    handleSyncSubtasks(selectedTask.id, updatedSubtasks);
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask || !newCommentText.trim()) return;
    setSubmittingComment(true);
    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId: selectedTask.id,
          content: newCommentText.trim(),
        }),
      });
      if (res.ok) {
        const newComment = await res.json();
        setComments((prev) => {
          if (prev.some((c) => c.id === newComment.id)) return prev;
          return [...prev, newComment];
        });
        setNewCommentText('');
        
        // Re-fetch activities to reflect the comment logging
        const actRes = await fetch(`/api/activities?taskId=${selectedTask.id}`);
        if (actRes.ok) {
          const activitiesData = await actRes.json();
          setActivities(activitiesData);
        }
      }
    } catch (err) {
      console.error('Failed to post comment:', err);
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleCommentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNewCommentText(value);

    const selectionStart = e.target.selectionStart || 0;
    const lastAtPos = value.lastIndexOf('@', selectionStart - 1);
    
    if (lastAtPos !== -1) {
      const charBeforeAt = lastAtPos > 0 ? value[lastAtPos - 1] : ' ';
      const textBetween = value.substring(lastAtPos + 1, selectionStart);
      
      if ((charBeforeAt === ' ' || charBeforeAt === '\n') && !textBetween.includes(' ')) {
        setShowMentionDropdown(true);
        setMentionSearchQuery(textBetween);
        setMentionTriggerIndex(lastAtPos);
        setMentionDropdownIndex(0);
        return;
      }
    }
    
    setShowMentionDropdown(false);
  };

  const handleCommentKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showMentionDropdown) return;
    
    const filteredUsers = users.filter((u) =>
      u.name && u.name.toLowerCase().includes(mentionSearchQuery.toLowerCase())
    );
    
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setMentionDropdownIndex((prev) => (prev + 1) % Math.max(1, filteredUsers.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setMentionDropdownIndex((prev) => (prev - 1 + filteredUsers.length) % Math.max(1, filteredUsers.length));
    } else if (e.key === 'Enter') {
      if (filteredUsers.length > 0) {
        e.preventDefault();
        selectUserMention(filteredUsers[mentionDropdownIndex]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setShowMentionDropdown(false);
    }
  };

  const selectUserMention = (user: User) => {
    if (mentionTriggerIndex === -1) return;
    
    const textBefore = newCommentText.substring(0, mentionTriggerIndex);
    const textAfter = newCommentText.substring(mentionTriggerIndex + mentionSearchQuery.length + 1);
    
    const newText = `${textBefore}@${user.name} ${textAfter}`;
    setNewCommentText(newText);
    setShowMentionDropdown(false);
    
    setTimeout(() => {
      const inputEl = document.getElementById('comment-input') as HTMLInputElement;
      if (inputEl) {
        inputEl.focus();
        const newCursorPos = textBefore.length + (user.name?.length || 0) + 2;
        inputEl.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 10);
  };

  const renderCommentContent = (content: string) => {
    if (!content) return '';
    if (!content.includes('@')) return content;

    const sortedUsers = [...users].sort((a, b) => (b.name?.length || 0) - (a.name?.length || 0));
    
    let parts: React.ReactNode[] = [content];
    
    for (const user of sortedUsers) {
      if (!user.name) continue;
      const mentionToken = `@${user.name}`;
      let newParts: React.ReactNode[] = [];
      
      for (const part of parts) {
        if (typeof part !== 'string') {
          newParts.push(part);
          continue;
        }
        
        if (!part.includes(mentionToken)) {
          newParts.push(part);
          continue;
        }
        
        let currentString = part;
        let keyCounter = 0;
        while (currentString.includes(mentionToken)) {
          const idx = currentString.indexOf(mentionToken);
          const before = currentString.substring(0, idx);
          const after = currentString.substring(idx + mentionToken.length);
          
          if (before) newParts.push(before);
          
          newParts.push(
            <span 
              key={`mention-${user.id}-${idx}-${keyCounter++}`}
              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-primary/20 text-primary font-bold text-[10px] border border-primary/20 cursor-default select-none transition-all duration-300 hover:scale-105 hover:bg-primary/30"
            >
              @{user.name}
            </span>
          );
          currentString = after;
        }
        if (currentString) newParts.push(currentString);
      }
      parts = newParts;
    }
    
    return parts;
  };

  const handleAIBreakdown = async () => {
    if (!selectedTask) return;
    setBreakingDownTask(true);
    try {
      const res = await fetch('/api/ai/breakdown', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: selectedTask.title,
          description: selectedTask.description,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to breakdown task');
      }

      const suggestedSubtasks = await res.json();
      const currentSubtasks = selectedTask.subtasks || [];
      const updatedSubtasks = [
        ...currentSubtasks,
        ...suggestedSubtasks.map((s: any) => ({ 
          ...s, 
          id: `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}` 
        }))
      ];
      await handleSyncSubtasks(selectedTask.id, updatedSubtasks);
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'AI breakdown failed. Make sure GEMINI_API_KEY is configured.');
    } finally {
      setBreakingDownTask(false);
    }
  };

  const handleGenerateReport = async () => {
    setIsReportModalOpen(true);
    setGeneratingReport(true);
    setReportText('');
    try {
      const res = await fetch(`/api/ai/summary?projectId=${selectedProjectFilter}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to generate report');
      }
      const data = await res.json();
      setReportText(data.summary);
    } catch (err: any) {
      console.error(err);
      setReportText(`### Error Generating Project Report\n\n${err.message || 'Make sure your GEMINI_API_KEY is configured in your environment variable.'}`);
    } finally {
      setGeneratingReport(false);
    }
  };

  const renderMarkdown = (text: string) => {
    return text.split('\n').map((line, index) => {
      let trimmed = line.trim();
      if (trimmed.startsWith('###')) {
        return <h5 key={index} className="text-sm font-bold text-primary mt-3 mb-1.5">{trimmed.replace(/^###\s*/, '')}</h5>;
      }
      if (trimmed.startsWith('##')) {
        return <h4 key={index} className="text-base font-extrabold text-secondary mt-4 mb-2">{trimmed.replace(/^##\s*/, '')}</h4>;
      }
      if (trimmed.startsWith('#')) {
        return <h3 key={index} className="text-lg font-black text-primary mt-5 mb-2.5">{trimmed.replace(/^#\s*/, '')}</h3>;
      }
      if (trimmed.startsWith('-') || trimmed.startsWith('*')) {
        const content = parseBold(trimmed.replace(/^[-*]\s*/, ''));
        return (
          <li key={index} className="ml-4 list-disc text-xs leading-relaxed text-on-surface-variant/90 mb-1">
            {content}
          </li>
        );
      }
      if (trimmed === '') {
        return <div key={index} className="h-2" />;
      }
      return <p key={index} className="text-xs leading-relaxed text-on-surface-variant/90 mb-2">{parseBold(line)}</p>;
    });
  };

  const parseBold = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="font-extrabold text-on-surface">{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  // Toggle user role in DB (Admin only)
  const handleToggleUserRole = async (userId: string, currentRole: string) => {
    if (!isAdmin) return; // Role Check
    const nextRole = currentRole === 'ADMIN' ? 'MEMBER' : 'ADMIN';
    try {
      const res = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: userId, role: nextRole }),
      });
      if (res.ok) {
        const updatedUser = await res.json();
        setUsers((prev) => prev.map((u) => (u.id === userId ? updatedUser : u)));
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Filter Tasks
  const filteredTasks = tasks.filter((task) => {
    const matchesProject = selectedProjectFilter === 'all' || task.projectId === selectedProjectFilter;
    const matchesSearch =
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (task.description && task.description.toLowerCase().includes(searchQuery.toLowerCase()));
    
    // Filter logic for MEMBER role on the Kanban board (Overview)
    if (!isAdmin && activeTab === 'overview' && memberViewFilter === 'my') {
      return matchesProject && matchesSearch && task.assigneeId === currentUserId;
    }
    
    return matchesProject && matchesSearch;
  });

  // Stats (derived from the active scope)
  const statTodo = filteredTasks.filter((t) => t.status === 'TODO').length;
  const statInProgress = filteredTasks.filter((t) => t.status === 'IN_PROGRESS').length;
  const statReview = filteredTasks.filter((t) => t.status === 'REVIEW').length;
  const statDone = filteredTasks.filter((t) => t.status === 'DONE').length;

  // Filtered users for mentions
  const filteredUsers = users.filter((u) =>
    u.name && u.name.toLowerCase().includes(mentionSearchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background text-on-surface pb-32 transition-colors duration-300">
      {/* Top Bar */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-surface/85 backdrop-blur-xl border-b border-white/10 dark:border-white/15 px-6 py-4 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg shadow-primary/20">
            <span className="material-symbols-outlined text-background font-bold text-2xl">layers</span>
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-black tracking-tight bg-gradient-to-r from-primary via-secondary to-tertiary bg-clip-text text-transparent leading-none">TaskFlow AI</span>
            <span className="text-[10px] text-on-surface-variant/65 tracking-wider uppercase font-semibold mt-1">Enterprise Board</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Light/Dark Toggle Switch */}
          <button
            onClick={toggleTheme}
            className="w-10 h-10 rounded-xl bg-surface-container/60 hover:bg-surface-container border border-white/10 flex items-center justify-center text-on-surface-variant hover:text-primary transition-all active:scale-90"
            title="Toggle color mode"
          >
            <span className="material-symbols-outlined text-xl">
              {theme === 'dark' ? 'light_mode' : 'dark_mode'}
            </span>
          </button>

          {/* User Profile Info */}
          <div className="hidden sm:flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl bg-surface-container/60 border border-white/10">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <div className="flex flex-col text-left">
              <span className="text-xs text-on-surface font-semibold">{session?.user?.name || 'Workspace User'}</span>
              <span className={`text-[9px] font-bold uppercase tracking-wider ${isAdmin ? 'text-primary' : 'text-on-surface-variant/80'}`}>
                {isAdmin ? '🛡️ Administrator' : '👥 Team Member'}
              </span>
            </div>
          </div>

          <button 
            onClick={() => signOut()}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-surface-variant/40 hover:bg-error/20 hover:text-error border border-white/10 transition-all text-xs font-bold shadow-sm"
          >
            <span className="material-symbols-outlined text-sm font-bold">logout</span>
            <span className="hidden md:inline">Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="mt-28 px-6 max-w-7xl mx-auto">
        {/* Navigation Tabs */}
        <div className="flex gap-2 p-1.5 bg-surface-container/50 backdrop-blur-md rounded-2xl border border-white/10 mb-8 overflow-x-auto w-fit max-w-full shadow-inner">
          {[
            { id: 'overview', label: 'Kanban Board', icon: 'dashboard' },
            { id: 'tasks', label: 'All Tasks', icon: 'assignment' },
            { id: 'analytics', label: 'Analytics', icon: 'insights' },
            { id: 'projects', label: 'Projects', icon: 'folder_open' },
            { id: 'team', label: 'Team Space', icon: 'group' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-primary text-background shadow-lg shadow-primary/15'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-variant/20'
              }`}
            >
              <span className="material-symbols-outlined text-lg">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Global Project & Search Filters */}
        <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center mb-8 bg-surface-container/30 p-4 rounded-2xl border border-white/10 shadow-sm">
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <span className="text-xs font-bold text-on-surface-variant flex items-center gap-1.5 uppercase tracking-wide">
              <span className="material-symbols-outlined text-sm">filter_list</span> Scope Project:
            </span>
            <select
              value={selectedProjectFilter}
              onChange={(e) => setSelectedProjectFilter(e.target.value)}
              className="bg-surface border border-white/10 rounded-xl px-3.5 py-2 text-xs font-semibold text-on-surface focus:outline-none focus:border-primary transition-all cursor-pointer shadow-sm"
            >
              <option value="all">All Active Projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>

            {/* MEMBER My vs All Tasks Toggle (Kanban overview tab only) */}
            {!isAdmin && activeTab === 'overview' && (
              <div className="flex items-center gap-1 bg-surface-variant/40 border border-white/10 rounded-xl p-1 ml-2">
                <button
                  onClick={() => setMemberViewFilter('my')}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-extrabold tracking-wide uppercase transition-all ${
                    memberViewFilter === 'my'
                      ? 'bg-primary text-background shadow-sm'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  My Tasks
                </button>
                <button
                  onClick={() => setMemberViewFilter('all')}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-extrabold tracking-wide uppercase transition-all ${
                    memberViewFilter === 'all'
                      ? 'bg-primary text-background shadow-sm'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  All Tasks
                </button>
              </div>
            )}

            {/* AI Progress Report Button */}
            <button
              onClick={handleGenerateReport}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 hover:bg-primary/25 border border-primary/20 text-primary font-bold rounded-xl text-xs transition-all active:scale-95 cursor-pointer shadow-sm ml-2"
              title="Generate Executive Agile Report for current project using Gemini AI"
            >
              <span className="material-symbols-outlined text-[15px] animate-pulse">psychology</span>
              AI Report
            </button>
          </div>

          <div className="relative w-full md:w-80">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 material-symbols-outlined text-on-surface-variant text-base">search</span>
            <input
              type="text"
              placeholder="Search tasks by title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-surface border border-white/10 rounded-xl pl-10 pr-4 py-2 text-xs text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary transition-all shadow-sm"
            />
          </div>
        </div>

        {/* ==================== TAB: OVERVIEW / KANBAN ==================== */}
        {activeTab === 'overview' && (
          <div className="flex flex-col gap-8 animate-fade-in">
            {/* Stats Summary Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Todo Tasks', value: statTodo, icon: 'list_alt', color: 'text-tertiary', bg: 'bg-tertiary/10', border: 'border-tertiary/10' },
                { label: 'In Progress', value: statInProgress, icon: 'trending_up', color: 'text-secondary', bg: 'bg-secondary/10', border: 'border-secondary/10' },
                { label: 'In Review', value: statReview, icon: 'rate_review', color: 'text-primary', bg: 'bg-primary/10', border: 'border-primary/10' },
                { label: 'Completed', value: statDone, icon: 'check_circle', color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/10' },
              ].map((stat, i) => (
                <div key={i} className={`glass-card p-5 rounded-2xl border ${stat.border} flex items-center justify-between shadow-sm hover:translate-y-[-2px] transition-all`}>
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] text-on-surface-variant/80 font-bold uppercase tracking-wider">{stat.label}</span>
                    <span className="text-3xl font-extrabold font-display leading-tight">{stat.value}</span>
                  </div>
                  <div className={`w-12 h-12 rounded-xl ${stat.bg} flex items-center justify-center ${stat.color} shadow-inner`}>
                    <span className="material-symbols-outlined text-2xl font-bold">{stat.icon}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Kanban Columns */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { id: 'TODO', title: 'To Do', color: 'border-tertiary/40 text-tertiary', badge: 'bg-tertiary/15' },
                { id: 'IN_PROGRESS', title: 'In Progress', color: 'border-secondary/40 text-secondary', badge: 'bg-secondary/15' },
                { id: 'REVIEW', title: 'Under Review', color: 'border-primary/40 text-primary', badge: 'bg-primary/15' },
                { id: 'DONE', title: 'Completed', color: 'border-emerald-500/40 text-emerald-500', badge: 'bg-emerald-500/15' },
              ].map((column) => {
                const columnTasks = filteredTasks.filter((t) => t.status === column.id);
                return (
                  <div 
                    key={column.id} 
                    onDragOver={(e) => {
                      e.preventDefault();
                    }}
                    onDragEnter={(e) => {
                      e.preventDefault();
                      setDragOverColumn(column.id);
                    }}
                    onDragLeave={() => {
                      setDragOverColumn(null);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragOverColumn(null);
                      const taskId = e.dataTransfer.getData('text/plain');
                      if (taskId) {
                        handleUpdateStatus(taskId, column.id);
                      }
                    }}
                    className={`flex flex-col gap-4 bg-surface-container/30 rounded-2xl border p-4 min-h-[500px] shadow-inner transition-all duration-200 ${
                      dragOverColumn === column.id 
                        ? 'border-primary/40 bg-surface-container/50 shadow-md scale-[1.01]' 
                        : 'border-white/5'
                    }`}
                  >
                    <div className="flex justify-between items-center pb-2.5 border-b border-white/10">
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${column.id === 'TODO' ? 'bg-tertiary' : column.id === 'IN_PROGRESS' ? 'bg-secondary' : column.id === 'REVIEW' ? 'bg-primary' : 'bg-emerald-500'}`}></span>
                        <h3 className="font-extrabold text-xs tracking-wide uppercase text-on-surface">{column.title}</h3>
                      </div>
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${column.badge} ${column.color.split(' ')[1]}`}>
                        {columnTasks.length}
                      </span>
                    </div>

                    <div className="flex flex-col gap-3 overflow-y-auto max-h-[600px] pr-1">
                      {columnTasks.length === 0 ? (
                        <div className="text-center py-10 text-xs text-on-surface-variant/40 border border-dashed border-white/10 rounded-xl">
                          No tasks here
                        </div>
                      ) : (
                        columnTasks.map((task) => {
                          const isAssignedToMe = task.assigneeId === currentUserId;
                          return (
                            <div
                              key={task.id}
                              draggable={isAdmin || isAssignedToMe}
                              onDragStart={(e) => {
                                e.dataTransfer.setData('text/plain', task.id);
                              }}
                              onClick={() => {
                                setSelectedTask(task);
                                setIsDetailModalOpen(true);
                              }}
                              className={`glass-card p-4 rounded-xl border transition-all cursor-grab active:cursor-grabbing group flex flex-col gap-2.5 shadow-sm hover:translate-y-[-2px] ${
                                !isAdmin && !isAssignedToMe
                                  ? 'border-white/5 opacity-70 hover:opacity-100 hover:border-white/10'
                                  : 'border-white/5 hover:border-primary/30'
                              }`}
                            >
                              <div className="flex justify-between items-start gap-2">
                                <h4 className="font-bold text-sm text-on-surface group-hover:text-primary transition-colors line-clamp-1 leading-snug">{task.title}</h4>
                                {!isAdmin && !isAssignedToMe && (
                                  <span className="flex-shrink-0 material-symbols-outlined text-[14px] text-on-surface-variant/40" title="Read-only (Assigned to another developer)">lock</span>
                                )}
                              </div>
                              <p className="text-xs text-on-surface-variant line-clamp-2 leading-relaxed">{task.description || 'No description provided'}</p>
                              
                              {/* Priority & Tags display on Kanban card */}
                              <div className="flex flex-wrap gap-1.5 items-center">
                                <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${
                                  task.priority === 'HIGH' ? 'bg-rose-500/15 text-rose-400 border border-rose-500/20' :
                                  task.priority === 'MEDIUM' ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20' :
                                  'bg-sky-500/15 text-sky-400 border border-sky-500/20'
                                }`}>
                                  {task.priority || 'MEDIUM'}
                                </span>

                                {task.tags && task.tags.map((tag, idx) => (
                                  <span key={idx} className="px-2 py-0.5 rounded bg-surface-variant/40 border border-white/5 text-[8px] text-on-surface-variant font-medium uppercase tracking-wide">
                                    #{tag}
                                  </span>
                                ))}
                              </div>

                              {/* Checklist status progress bar on Kanban card */}
                              {task.subtasks && task.subtasks.length > 0 && (
                                <div className="flex flex-col gap-1 mt-0.5">
                                  <div className="flex justify-between items-center text-[8px] font-bold text-on-surface-variant/80">
                                    <span className="flex items-center gap-1">
                                      <span className="material-symbols-outlined text-[10px]">task_alt</span>
                                      Checklist
                                    </span>
                                    <span>
                                      {task.subtasks.filter(s => s.isCompleted).length}/{task.subtasks.length}
                                    </span>
                                  </div>
                                  <div className="w-full h-1 bg-surface-container rounded-full overflow-hidden">
                                    <div 
                                      className="h-full bg-primary transition-all duration-300"
                                      style={{ 
                                        width: `${Math.round((task.subtasks.filter(s => s.isCompleted).length / task.subtasks.length) * 100)}%` 
                                      }}
                                    ></div>
                                  </div>
                                </div>
                              )}
                              
                              <div className="flex justify-between items-center pt-2 border-t border-white/10 text-[10px] text-on-surface-variant/80">
                                <span className="flex items-center gap-1 font-medium truncate max-w-[100px]">
                                  <span className="material-symbols-outlined text-[12px] text-on-surface-variant/60">folder</span>
                                  {task.project?.name || 'Project'}
                                </span>
                                
                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                  <div className={`px-2 py-0.5 rounded border font-semibold text-[8px] uppercase ${
                                    isAssignedToMe
                                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                      : 'bg-surface-variant/60 border-white/5'
                                  }`}>
                                    {task.assignee?.name ? task.assignee.name.split(' ')[0] : 'UNASSIGNED'}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* Quick Add Task Column Button (Admin Only) */}
                    {isAdmin ? (
                      <button
                        onClick={() => {
                          setTaskForm((prev) => ({ ...prev, status: column.id }));
                          setIsTaskModalOpen(true);
                        }}
                        className="mt-auto flex items-center justify-center gap-2 py-2.5 border border-dashed border-white/10 hover:border-primary/40 rounded-xl text-xs font-semibold text-on-surface-variant hover:text-primary transition-all group"
                      >
                        <span className="material-symbols-outlined text-sm group-hover:rotate-90 transition-transform">add</span>
                        Quick Add Task
                      </button>
                    ) : (
                      <div className="mt-auto py-2 text-center text-[10px] text-on-surface-variant/30 italic">
                        {memberViewFilter === 'my' ? 'My Space' : 'Shared Space (Read Only)'}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ==================== TAB: ALL TASKS LIST ==================== */}
        {activeTab === 'tasks' && (
          <div className="glass-card rounded-2xl border border-white/10 overflow-hidden shadow-sm animate-fade-in">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container/60 border-b border-white/10 text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                    <th className="p-4 pl-6">Task Title</th>
                    <th className="p-4">Project</th>
                    <th className="p-4">Assignee</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Due Date</th>
                    <th className="p-4 text-right pr-6">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-xs font-medium">
                  {filteredTasks.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-on-surface-variant/50">
                        No tasks found matching current filters.
                      </td>
                    </tr>
                  ) : (
                    filteredTasks.map((task) => {
                      const isAssignedToMe = task.assigneeId === currentUserId;
                      return (
                        <tr key={task.id} className={`hover:bg-surface-container/20 transition-colors ${!isAdmin && !isAssignedToMe ? 'opacity-85' : ''}`}>
                          <td className="p-4 pl-6 font-bold text-sm">
                            <button
                              onClick={() => {
                                setSelectedTask(task);
                                setIsDetailModalOpen(true);
                              }}
                              className="hover:text-primary transition-colors text-left flex items-center gap-1.5"
                            >
                              {task.title}
                              {!isAdmin && !isAssignedToMe && (
                                <span className="material-symbols-outlined text-xs text-on-surface-variant/40" title="Read-only">lock</span>
                              )}
                            </button>
                          </td>
                          <td className="p-4 text-on-surface-variant font-semibold">
                            <span className="flex items-center gap-1.5">
                              <span className="material-symbols-outlined text-base text-on-surface-variant/50">folder</span>
                              {task.project?.name}
                            </span>
                          </td>
                          <td className="p-4">
                            <select
                              value={task.assigneeId || ''}
                              disabled={!isAdmin} // Assignees can only be modified by Admins, locked for all members
                              onChange={(e) => handleUpdateAssignee(task.id, e.target.value)}
                              className="bg-surface border border-white/10 rounded-lg px-2 py-1 text-xs text-on-surface focus:outline-none focus:border-primary disabled:opacity-75 disabled:cursor-not-allowed font-semibold shadow-sm"
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
                              disabled={!isAdmin && !isAssignedToMe} // Disable editing status for other members' tasks
                              onChange={(e) => handleUpdateStatus(task.id, e.target.value)}
                              className={`border border-white/10 rounded-lg px-2.5 py-1 text-xs font-bold focus:outline-none cursor-pointer shadow-sm disabled:opacity-75 disabled:cursor-not-allowed ${
                                task.status === 'TODO' ? 'bg-tertiary/10 text-tertiary' :
                                task.status === 'IN_PROGRESS' ? 'bg-secondary/10 text-secondary' :
                                task.status === 'REVIEW' ? 'bg-primary/10 text-primary' :
                                'bg-emerald-500/10 text-emerald-500'
                              }`}
                            >
                              <option value="TODO">To Do</option>
                              <option value="IN_PROGRESS">In Progress</option>
                              <option value="REVIEW">Review</option>
                              <option value="DONE">Completed</option>
                            </select>
                          </td>
                          <td className="p-4 text-on-surface-variant font-semibold">
                            {task.dueDate ? new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'No Date'}
                          </td>
                          <td className="p-4 text-right pr-6">
                            <button
                              onClick={() => {
                                setSelectedTask(task);
                                setIsDetailModalOpen(true);
                              }}
                              className="p-1.5 rounded-lg hover:bg-surface-variant/40 text-on-surface-variant hover:text-primary transition-all"
                            >
                              <span className="material-symbols-outlined text-base">
                                {isAdmin ? 'edit' : 'visibility'}
                              </span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ==================== TAB: ANALYTICS ==================== */}
        {activeTab === 'analytics' && (
          <div className="space-y-6 animate-fade-in pb-12">
            {/* KPI Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Card 1: Completion Rate */}
              <div className="glass-card rounded-2xl border border-white/10 p-5 shadow-sm flex items-center justify-between gap-4">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Completion Rate</span>
                  <span className="text-3xl font-black text-on-surface">
                    {filteredTasks.length > 0 
                      ? `${Math.round((filteredTasks.filter(t => t.status === 'DONE').length / filteredTasks.length) * 100)}%`
                      : '0%'}
                  </span>
                  <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-0.5 mt-0.5">
                    <span className="material-symbols-outlined text-[12px] font-black">arrow_upward</span>
                    {filteredTasks.filter(t => t.status === 'DONE').length} of {filteredTasks.length} tasks
                  </span>
                </div>
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined text-2xl">verified</span>
                </div>
              </div>

              {/* Card 2: Active Workload */}
              <div className="glass-card rounded-2xl border border-white/10 p-5 shadow-sm flex items-center justify-between gap-4">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Active Workload</span>
                  <span className="text-3xl font-black text-on-surface">
                    {filteredTasks.filter(t => t.status === 'IN_PROGRESS' || t.status === 'REVIEW').length}
                  </span>
                  <span className="text-[10px] text-secondary font-semibold flex items-center gap-0.5 mt-0.5">
                    In Progress or Under Review
                  </span>
                </div>
                <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center text-secondary">
                  <span className="material-symbols-outlined text-2xl">pending_actions</span>
                </div>
              </div>

              {/* Card 3: Overdue Tasks */}
              {(() => {
                const today = new Date().toISOString().split('T')[0];
                const overdue = filteredTasks.filter(t => t.dueDate && t.dueDate.split('T')[0] < today && t.status !== 'DONE');
                return (
                  <div className="glass-card rounded-2xl border border-white/10 p-5 shadow-sm flex items-center justify-between gap-4">
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Overdue Tasks</span>
                      <span className={`text-3xl font-black ${overdue.length > 0 ? 'text-rose-400 animate-pulse' : 'text-on-surface'}`}>
                        {overdue.length}
                      </span>
                      <span className="text-[10px] text-on-surface-variant font-semibold flex items-center gap-0.5 mt-0.5">
                        Needs immediate attention
                      </span>
                    </div>
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${overdue.length > 0 ? 'bg-rose-500/10 text-rose-400' : 'bg-surface-variant/40 text-on-surface-variant'}`}>
                      <span className="material-symbols-outlined text-2xl">error_outline</span>
                    </div>
                  </div>
                );
              })()}

              {/* Card 4: Checklist Progress */}
              {(() => {
                const totalSubtasks = filteredTasks.reduce((sum, t) => sum + (t.subtasks?.length || 0), 0);
                const completedSubtasks = filteredTasks.reduce((sum, t) => sum + (t.subtasks?.filter(s => s.isCompleted).length || 0), 0);
                const subtaskRate = totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0;
                return (
                  <div className="glass-card rounded-2xl border border-white/10 p-5 shadow-sm flex items-center justify-between gap-4">
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Checklist Progress</span>
                      <span className="text-3xl font-black text-on-surface">
                        {subtaskRate}%
                      </span>
                      <span className="text-[10px] text-tertiary font-semibold flex items-center gap-0.5 mt-0.5">
                        {completedSubtasks} of {totalSubtasks} items complete
                      </span>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-tertiary/10 flex items-center justify-center text-tertiary">
                      <span className="material-symbols-outlined text-2xl">playlist_add_check</span>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Grid Charts Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Chart 1: Priority Breakdown */}
              <div className="glass-card rounded-2xl border border-white/10 p-6 shadow-sm flex flex-col gap-4">
                <h4 className="text-xs font-black text-on-surface-variant uppercase tracking-wider flex items-center gap-1.5 border-b border-white/10 pb-3">
                  <span className="material-symbols-outlined text-sm text-primary">warning</span>
                  Task Priority Breakdown
                </h4>
                {(() => {
                  const high = filteredTasks.filter(t => t.priority === 'HIGH').length;
                  const medium = filteredTasks.filter(t => t.priority === 'MEDIUM').length;
                  const low = filteredTasks.filter(t => t.priority === 'LOW').length;
                  const max = Math.max(high, medium, low, 1);
                  return (
                    <div className="flex flex-col gap-4 py-3">
                      {[
                        { label: 'HIGH PRIORITY', count: high, percent: Math.round((high / max) * 100), colorClass: 'bg-rose-500', textClass: 'text-rose-400' },
                        { label: 'MEDIUM PRIORITY', count: medium, percent: Math.round((medium / max) * 100), colorClass: 'bg-amber-500', textClass: 'text-amber-400' },
                        { label: 'LOW PRIORITY', count: low, percent: Math.round((low / max) * 100), colorClass: 'bg-sky-500', textClass: 'text-sky-400' },
                      ].map((p) => (
                        <div key={p.label} className="flex flex-col gap-1.5">
                          <div className="flex justify-between items-center text-[10px] font-bold">
                            <span className={p.textClass}>{p.label}</span>
                            <span className="text-on-surface">{p.count} tasks ({filteredTasks.length > 0 ? Math.round((p.count / filteredTasks.length) * 100) : 0}%)</span>
                          </div>
                          <div className="w-full h-3 bg-surface-variant/30 rounded-full overflow-hidden border border-white/5">
                            <div 
                              className={`h-full ${p.colorClass} rounded-full transition-all duration-500`}
                              style={{ width: `${filteredTasks.length > 0 ? (p.count / filteredTasks.length) * 100 : 0}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>

              {/* Chart 2: Status Lifecycle */}
              <div className="glass-card rounded-2xl border border-white/10 p-6 shadow-sm flex flex-col gap-4">
                <h4 className="text-xs font-black text-on-surface-variant uppercase tracking-wider flex items-center gap-1.5 border-b border-white/10 pb-3">
                  <span className="material-symbols-outlined text-sm text-primary">donut_large</span>
                  Status Lifecycle Allocation
                </h4>
                {(() => {
                  const todo = filteredTasks.filter(t => t.status === 'TODO').length;
                  const inProgress = filteredTasks.filter(t => t.status === 'IN_PROGRESS').length;
                  const review = filteredTasks.filter(t => t.status === 'REVIEW').length;
                  const done = filteredTasks.filter(t => t.status === 'DONE').length;
                  const total = filteredTasks.length || 1;
                  return (
                    <div className="flex flex-col gap-4 py-3">
                      <div className="w-full h-4 bg-surface-variant/30 rounded-full overflow-hidden flex border border-white/5">
                        <div className="bg-tertiary h-full transition-all duration-300" style={{ width: `${(todo / total) * 100}%` }} title={`To Do: ${todo}`} />
                        <div className="bg-secondary h-full transition-all duration-300" style={{ width: `${(inProgress / total) * 100}%` }} title={`In Progress: ${inProgress}`} />
                        <div className="bg-primary h-full transition-all duration-300" style={{ width: `${(review / total) * 100}%` }} title={`Under Review: ${review}`} />
                        <div className="bg-emerald-500 h-full transition-all duration-300" style={{ width: `${(done / total) * 100}%` }} title={`Completed: ${done}`} />
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-[10px] font-bold">
                        <div className="flex items-center gap-2 text-tertiary">
                          <span className="w-2.5 h-2.5 bg-tertiary rounded flex-shrink-0"></span>
                          <span>To Do: {todo} ({Math.round((todo / total) * 100)}%)</span>
                        </div>
                        <div className="flex items-center gap-2 text-secondary">
                          <span className="w-2.5 h-2.5 bg-secondary rounded flex-shrink-0"></span>
                          <span>In Progress: {inProgress} ({Math.round((inProgress / total) * 100)}%)</span>
                        </div>
                        <div className="flex items-center gap-2 text-primary">
                          <span className="w-2.5 h-2.5 bg-primary rounded flex-shrink-0"></span>
                          <span>Review: {review} ({Math.round((review / total) * 100)}%)</span>
                        </div>
                        <div className="flex items-center gap-2 text-emerald-400">
                          <span className="w-2.5 h-2.5 bg-emerald-500 rounded flex-shrink-0"></span>
                          <span>Completed: {done} ({Math.round((done / total) * 100)}%)</span>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Team Task Workload Analysis */}
            <div className="glass-card rounded-2xl border border-white/10 p-6 shadow-sm flex flex-col gap-4">
              <h4 className="text-xs font-black text-on-surface-variant uppercase tracking-wider flex items-center gap-1.5 border-b border-white/10 pb-3">
                <span className="material-symbols-outlined text-sm text-primary">group</span>
                Team Workload & Velocity Analysis
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="text-on-surface-variant font-bold border-b border-white/10 pb-2">
                      <th className="py-2 pl-2">Team Member</th>
                      <th className="py-2">Assigned Tasks</th>
                      <th className="py-2">Pending Checklist Progress</th>
                      <th className="py-2">Completed Tasks</th>
                      <th className="py-2 pr-2 text-right">Workload Loadout</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-semibold">
                    {users.map((u) => {
                      const userTasks = filteredTasks.filter(t => t.assigneeId === u.id);
                      const completed = userTasks.filter(t => t.status === 'DONE').length;
                      const pending = userTasks.length - completed;
                      const percent = userTasks.length > 0 ? Math.round((completed / userTasks.length) * 100) : 0;
                      return (
                        <tr key={u.id} className="hover:bg-white/5 transition-colors">
                          <td className="py-3.5 pl-2 flex items-center gap-2.5">
                            <div className="w-6.5 h-6.5 rounded-full bg-gradient-to-br from-primary/30 to-secondary/30 flex items-center justify-center text-[8px] font-black text-primary border border-white/15 uppercase">
                              {u.name ? u.name.substring(0, 2) : '??'}
                            </div>
                            <span className="text-on-surface text-sm font-extrabold">{u.name}</span>
                          </td>
                          <td className="py-3.5 text-on-surface-variant font-black">{userTasks.length} tasks</td>
                          <td className="py-3.5 text-on-surface-variant">{pending} tasks pending</td>
                          <td className="py-3.5 text-emerald-400">{completed} tasks done</td>
                          <td className="py-3.5 pr-2 text-right">
                            <div className="flex items-center justify-end gap-3">
                              <span className="text-[10px] font-bold text-on-surface-variant/80">{percent}% Complete</span>
                              <div className="w-24 h-2 bg-surface-variant/30 rounded-full overflow-hidden border border-white/5">
                                <div className="h-full bg-gradient-to-r from-primary to-secondary rounded-full" style={{ width: `${percent}%` }} />
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ==================== TAB: PROJECTS LIST ==================== */}
        {activeTab === 'projects' && (
          <div className="flex flex-col gap-6 animate-fade-in">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-extrabold tracking-tight">Active Projects ({projects.length})</h2>
                <p className="text-xs text-on-surface-variant mt-0.5">Manage workspaces and progression stats</p>
              </div>
              {isAdmin && (
                <button
                  onClick={() => setIsProjectModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary to-secondary text-background font-black rounded-xl shadow-lg hover:shadow-primary/30 transition-all text-xs active:scale-95"
                >
                  <span className="material-symbols-outlined text-base font-bold">add</span> Create Project
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((project) => {
                const projectTasks = tasks.filter((t) => t.projectId === project.id);
                const completedTasks = projectTasks.filter((t) => t.status === 'DONE').length;
                const progressPercent = projectTasks.length > 0 ? Math.round((completedTasks / projectTasks.length) * 100) : 0;

                return (
                  <div key={project.id} className="glass-card p-6 rounded-2xl border border-white/5 hover:border-primary/20 transition-all flex flex-col gap-4 shadow-sm">
                    <div className="flex items-start justify-between">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                        <span className="material-symbols-outlined">folder</span>
                      </div>
                      <span className="text-[10px] text-on-surface-variant/80 font-bold bg-surface-container/60 px-2.5 py-1 rounded-lg border border-white/5">
                        {projectTasks.length} {projectTasks.length === 1 ? 'task' : 'tasks'}
                      </span>
                    </div>

                    <div>
                      <h3 className="font-extrabold text-base text-on-surface mb-1">{project.name}</h3>
                      <p className="text-xs text-on-surface-variant/80 line-clamp-2 leading-relaxed">{project.description || 'No description provided'}</p>
                    </div>

                    <div className="mt-2 pt-4 border-t border-white/10 flex flex-col gap-2">
                      <div className="flex justify-between text-xs font-bold text-on-surface-variant">
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
                <h2 className="text-xl font-extrabold tracking-tight">Team Space ({users.length})</h2>
                <p className="text-xs text-on-surface-variant mt-0.5">Manage developer roles and authority states</p>
              </div>
              {isAdmin && (
                <button
                  onClick={() => setIsInviteModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary to-secondary text-background font-black rounded-xl shadow-lg hover:shadow-primary/30 transition-all text-xs active:scale-95"
                >
                  <span className="material-symbols-outlined text-base font-bold">person_add</span> Invite Member
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {users.map((member) => (
                <div key={member.id} className="glass-card p-5 rounded-2xl border border-white/5 hover:border-primary/20 transition-all flex items-center gap-4 shadow-sm">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center font-black text-lg text-primary border border-white/10 uppercase shadow-inner">
                    {member.name.substring(0, 2)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="font-extrabold text-sm text-on-surface truncate">{member.name}</h3>
                    <p className="text-xs text-on-surface-variant/80 truncate leading-relaxed">{member.email}</p>
                  </div>

                  <div className="flex flex-col items-end gap-1.5">
                    {isAdmin ? (
                      <button
                        onClick={() => handleToggleUserRole(member.id, member.role)}
                        className={`px-3 py-1 rounded-xl text-[9px] font-black tracking-wider uppercase transition-all border ${
                          member.role === 'ADMIN'
                            ? 'bg-primary text-background border-primary shadow-sm hover:opacity-90'
                            : 'bg-surface-variant/40 text-on-surface-variant border-white/10 hover:bg-surface-variant/60'
                        }`}
                      >
                        {member.role}
                      </button>
                    ) : (
                      <span className={`px-3 py-1.5 rounded-xl text-[9px] font-bold tracking-wider uppercase border ${
                        member.role === 'ADMIN' ? 'bg-primary/10 text-primary border-primary/25' : 'bg-surface-container text-on-surface-variant border-white/5'
                      }`}>
                        {member.role}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Floating Action Button (FAB) (Admin Only) */}
      {isAdmin && (
        <button
          onClick={() => {
            setTaskForm((prev) => ({ ...prev, status: 'TODO' }));
            setIsTaskModalOpen(true);
          }}
          className="fixed right-6 bottom-6 w-14 h-14 bg-gradient-to-r from-primary to-secondary text-background rounded-2xl flex items-center justify-center shadow-lg shadow-primary/30 hover:scale-110 active:scale-95 transition-all z-30 group"
        >
          <span className="material-symbols-outlined text-3xl font-black transition-transform group-hover:rotate-90">add</span>
        </button>
      )}

      {/* ==================== MODAL: CREATE TASK (Admin Only) ==================== */}
      {isTaskModalOpen && isAdmin && (
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
                  className="bg-surface border border-white/10 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-primary text-on-surface placeholder:text-on-surface-variant/40"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-on-surface-variant">Description</label>
                <textarea
                  placeholder="Describe the goals or context..."
                  value={taskForm.description}
                  onChange={(e) => setTaskForm((prev) => ({ ...prev, description: e.target.value }))}
                  className="bg-surface border border-white/10 rounded-xl px-3.5 py-2.5 text-xs h-24 focus:outline-none focus:border-primary text-on-surface placeholder:text-on-surface-variant/40 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-on-surface-variant">Project</label>
                  <select
                    value={taskForm.projectId}
                    onChange={(e) => setTaskForm((prev) => ({ ...prev, projectId: e.target.value }))}
                    className="bg-surface border border-white/10 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-primary text-on-surface"
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
                    className="bg-surface border border-white/10 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-primary text-on-surface"
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
                    className="bg-surface border border-white/10 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-primary text-on-surface"
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
                    className="bg-surface border border-white/10 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-primary text-on-surface"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-on-surface-variant">Priority</label>
                  <select
                    value={taskForm.priority}
                    onChange={(e) => setTaskForm((prev) => ({ ...prev, priority: e.target.value }))}
                    className="bg-surface border border-white/10 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-primary text-on-surface font-semibold"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-on-surface-variant">Tags (comma separated)</label>
                  <input
                    type="text"
                    placeholder="e.g. design, frontend"
                    value={taskForm.tagsString}
                    onChange={(e) => setTaskForm((prev) => ({ ...prev, tagsString: e.target.value }))}
                    className="bg-surface border border-white/10 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-primary text-on-surface placeholder:text-on-surface-variant/40"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="mt-4 bg-gradient-to-r from-primary to-secondary text-background font-black py-3 rounded-xl hover:opacity-90 active:scale-95 transition-all text-xs"
              >
                Create Task
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ==================== MODAL: CREATE PROJECT (Admin Only) ==================== */}
      {isProjectModalOpen && isAdmin && (
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
                  className="bg-surface border border-white/10 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-primary text-on-surface placeholder:text-on-surface-variant/40"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-on-surface-variant">Description</label>
                <textarea
                  placeholder="Brief summary of the goals or scope..."
                  value={projectForm.description}
                  onChange={(e) => setProjectForm((prev) => ({ ...prev, description: e.target.value }))}
                  className="bg-surface border border-white/10 rounded-xl px-3.5 py-2.5 text-xs h-24 focus:outline-none focus:border-primary text-on-surface placeholder:text-on-surface-variant/40 resize-none"
                />
              </div>

              <button
                type="submit"
                className="mt-4 bg-gradient-to-r from-primary to-secondary text-background font-black py-3 rounded-xl hover:opacity-90 active:scale-95 transition-all text-xs"
              >
                Create Project
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ==================== MODAL: INVITE MEMBER (Admin Only) ==================== */}
      {isInviteModalOpen && isAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-fade-in">
          <div className="glass-card w-full max-w-md rounded-2xl border border-white/10 p-6 shadow-2xl relative">
            <button
              onClick={() => setIsInviteModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-white/10 text-on-surface-variant hover:text-on-surface transition-colors"
            >
              <span className="material-symbols-outlined">close</span>
            </button>

            <h3 className="text-lg font-bold mb-5 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">person_add</span> Invite Team Member
            </h3>

            <form onSubmit={handleInviteMember} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-on-surface-variant">Member Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Liam Foster"
                  value={inviteForm.name}
                  onChange={(e) => setInviteForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="bg-surface border border-white/10 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-primary text-on-surface placeholder:text-on-surface-variant/40"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-on-surface-variant">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. liam@taskflow.io"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm((prev) => ({ ...prev, email: e.target.value }))}
                  className="bg-surface border border-white/10 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-primary text-on-surface placeholder:text-on-surface-variant/40"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-on-surface-variant">System Role</label>
                <select
                  value={inviteForm.role}
                  onChange={(e) => setInviteForm((prev) => ({ ...prev, role: e.target.value }))}
                  className="bg-surface border border-white/10 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-primary text-on-surface"
                >
                  <option value="MEMBER">Team Member</option>
                  <option value="ADMIN">Administrator</option>
                </select>
              </div>

              <button
                type="submit"
                className="mt-4 bg-gradient-to-r from-primary to-secondary text-background font-black py-3 rounded-xl hover:opacity-90 active:scale-95 transition-all text-xs"
              >
                Send Workspace Invite
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ==================== MODAL: TASK DETAIL VIEW (Adaptive Roles) ==================== */}
      {isDetailModalOpen && selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-fade-in overflow-y-auto">
          <div className="glass-card w-full max-w-lg rounded-2xl border border-white/10 p-6 shadow-2xl relative flex flex-col gap-5 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsDetailModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-white/10 text-on-surface-variant hover:text-on-surface transition-colors"
            >
              <span className="material-symbols-outlined">close</span>
            </button>

            <div>
              <span className="text-[9px] font-black tracking-widest bg-primary/10 text-primary border border-primary/25 px-2.5 py-1 rounded-md uppercase">
                {selectedTask.project?.name || 'Unassigned Project'}
              </span>
              <h3 className="text-xl font-extrabold mt-3.5 text-on-surface leading-snug">{selectedTask.title}</h3>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Description</span>
              <div className="bg-surface-container/40 p-4 rounded-xl border border-white/5 text-xs leading-relaxed text-on-surface">
                {selectedTask.description || 'No description provided.'}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 border-t border-white/10 pt-4 relative">
              {/* Assignee Custom Dropdown */}
              <div className="flex flex-col gap-1.5 relative">
                <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Assignee</span>
                <button
                  type="button"
                  disabled={!isAdmin}
                  onClick={() => setActiveDropdown(activeDropdown === 'assignee' ? null : 'assignee')}
                  className="flex items-center justify-between bg-surface border border-white/10 rounded-xl px-3 py-2 text-xs font-semibold text-on-surface focus:outline-none cursor-pointer w-full disabled:opacity-75 disabled:cursor-not-allowed shadow-sm hover:border-white/20 transition-all text-left"
                >
                  <span className="flex items-center gap-1.5 truncate">
                    <div className="w-4.5 h-4.5 rounded-full bg-gradient-to-br from-primary/30 to-secondary/30 flex items-center justify-center text-[8px] font-black text-primary border border-white/15 uppercase flex-shrink-0">
                      {selectedTask.assignee?.name ? selectedTask.assignee.name.substring(0, 2) : 'UN'}
                    </div>
                    <span className="truncate">{selectedTask.assignee?.name || 'Unassigned'}</span>
                  </span>
                  <span className="material-symbols-outlined text-sm text-on-surface-variant flex-shrink-0">
                    {activeDropdown === 'assignee' ? 'expand_less' : 'expand_more'}
                  </span>
                </button>

                {activeDropdown === 'assignee' && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setActiveDropdown(null)} />
                    <div className="absolute top-[105%] left-0 w-full bg-surface/95 backdrop-blur-xl border border-white/10 shadow-2xl rounded-xl p-1 z-40 flex flex-col gap-0.5 max-h-[160px] overflow-y-auto animate-fade-in">
                      <button
                        type="button"
                        onClick={() => {
                          handleUpdateAssignee(selectedTask.id, '');
                          setActiveDropdown(null);
                        }}
                        className={`flex items-center gap-2 px-2.5 py-1.5 text-xs rounded-lg cursor-pointer font-semibold w-full text-left transition-all ${
                          !selectedTask.assigneeId ? 'bg-primary/10 text-primary' : 'text-on-surface hover:bg-white/5'
                        }`}
                      >
                        <div className="w-4.5 h-4.5 rounded-full bg-white/10 flex items-center justify-center text-[7px] font-black text-on-surface-variant uppercase flex-shrink-0">
                          UN
                        </div>
                        Unassigned
                      </button>
                      {users.map((u) => (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => {
                            handleUpdateAssignee(selectedTask.id, u.id);
                            setActiveDropdown(null);
                          }}
                          className={`flex items-center gap-2 px-2.5 py-1.5 text-xs rounded-lg cursor-pointer font-semibold w-full text-left transition-all ${
                            selectedTask.assigneeId === u.id ? 'bg-primary/10 text-primary' : 'text-on-surface hover:bg-white/5'
                          }`}
                        >
                          <div className="w-4.5 h-4.5 rounded-full bg-gradient-to-br from-primary/30 to-secondary/30 flex items-center justify-center text-[7px] font-black text-primary border border-white/15 uppercase flex-shrink-0">
                            {u.name ? u.name.substring(0, 2) : '??'}
                          </div>
                          <span className="truncate">{u.name}</span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Status Custom Dropdown */}
              <div className="flex flex-col gap-1.5 relative">
                <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Status</span>
                <button
                  type="button"
                  disabled={!isAdmin && selectedTask.assigneeId !== currentUserId}
                  onClick={() => setActiveDropdown(activeDropdown === 'status' ? null : 'status')}
                  className={`flex items-center justify-between border rounded-xl px-3 py-2 text-xs font-bold focus:outline-none cursor-pointer w-full shadow-sm transition-all text-left disabled:opacity-75 disabled:cursor-not-allowed ${
                    selectedTask.status === 'TODO' ? 'bg-tertiary/10 text-tertiary border-tertiary/20' :
                    selectedTask.status === 'IN_PROGRESS' ? 'bg-secondary/10 text-secondary border-secondary/20' :
                    selectedTask.status === 'REVIEW' ? 'bg-primary/10 text-primary border-primary/20' :
                    'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-current flex-shrink-0"></span>
                    <span>
                      {selectedTask.status === 'TODO' ? 'To Do' :
                       selectedTask.status === 'IN_PROGRESS' ? 'In Progress' :
                       selectedTask.status === 'REVIEW' ? 'Review' : 'Completed'}
                    </span>
                  </span>
                  <span className="material-symbols-outlined text-sm text-current flex-shrink-0">
                    {activeDropdown === 'status' ? 'expand_less' : 'expand_more'}
                  </span>
                </button>

                {activeDropdown === 'status' && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setActiveDropdown(null)} />
                    <div className="absolute top-[105%] left-0 w-full bg-surface/95 backdrop-blur-xl border border-white/10 shadow-2xl rounded-xl p-1 z-40 flex flex-col gap-0.5 animate-fade-in">
                      {[
                        { val: 'TODO', label: 'To Do', colorClass: 'text-tertiary hover:bg-tertiary/5' },
                        { val: 'IN_PROGRESS', label: 'In Progress', colorClass: 'text-secondary hover:bg-secondary/5' },
                        { val: 'REVIEW', label: 'Review', colorClass: 'text-primary hover:bg-primary/5' },
                        { val: 'DONE', label: 'Completed', colorClass: 'text-emerald-400 hover:bg-emerald-500/5' },
                      ].map((opt) => (
                        <button
                          key={opt.val}
                          type="button"
                          onClick={() => {
                            handleUpdateStatus(selectedTask.id, opt.val);
                            setActiveDropdown(null);
                          }}
                          className={`flex items-center justify-between px-3 py-1.5 text-xs rounded-lg cursor-pointer font-bold w-full text-left transition-all ${
                            selectedTask.status === opt.val 
                              ? 'bg-white/5 ' + opt.colorClass 
                              : 'text-on-surface hover:bg-white/5'
                          }`}
                        >
                          <span className="flex items-center gap-1.5">
                            <span className={`w-1.5 h-1.5 rounded-full bg-current ${opt.colorClass.split(' ')[0]}`}></span>
                            {opt.label}
                          </span>
                          {selectedTask.status === opt.val && (
                            <span className="material-symbols-outlined text-xs">check</span>
                          )}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 border-b border-white/10 pb-4 relative">
              {/* Priority Custom Dropdown */}
              <div className="flex flex-col gap-1.5 relative">
                <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Priority</span>
                <button
                  type="button"
                  disabled={!isAdmin && selectedTask.assigneeId !== currentUserId}
                  onClick={() => setActiveDropdown(activeDropdown === 'priority' ? null : 'priority')}
                  className={`flex items-center justify-between border rounded-xl px-3 py-2 text-xs font-bold focus:outline-none cursor-pointer w-full shadow-sm transition-all text-left disabled:opacity-75 disabled:cursor-not-allowed ${
                    selectedTask.priority === 'HIGH' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                    selectedTask.priority === 'MEDIUM' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                    'bg-sky-500/10 text-sky-400 border-sky-500/20'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm">
                      {selectedTask.priority === 'HIGH' ? 'keyboard_double_arrow_up' :
                       selectedTask.priority === 'MEDIUM' ? 'keyboard_arrow_up' : 'keyboard_arrow_down'}
                    </span>
                    <span>{selectedTask.priority}</span>
                  </span>
                  <span className="material-symbols-outlined text-sm text-current flex-shrink-0">
                    {activeDropdown === 'priority' ? 'expand_less' : 'expand_more'}
                  </span>
                </button>

                {activeDropdown === 'priority' && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setActiveDropdown(null)} />
                    <div className="absolute top-[105%] left-0 w-full bg-surface/95 backdrop-blur-xl border border-white/10 shadow-2xl rounded-xl p-1 z-40 flex flex-col gap-0.5 animate-fade-in">
                      {[
                        { val: 'LOW', label: 'LOW', colorClass: 'text-sky-400', icon: 'keyboard_arrow_down' },
                        { val: 'MEDIUM', label: 'MEDIUM', colorClass: 'text-amber-400', icon: 'keyboard_arrow_up' },
                        { val: 'HIGH', label: 'HIGH', colorClass: 'text-rose-400', icon: 'keyboard_double_arrow_up' },
                      ].map((opt) => (
                        <button
                          key={opt.val}
                          type="button"
                          onClick={() => {
                            handleUpdatePriority(selectedTask.id, opt.val);
                            setActiveDropdown(null);
                          }}
                          className={`flex items-center justify-between px-3 py-1.5 text-xs rounded-lg cursor-pointer font-bold w-full text-left transition-all ${
                            selectedTask.priority === opt.val 
                              ? 'bg-white/5 ' + opt.colorClass 
                              : 'text-on-surface hover:bg-white/5'
                          }`}
                        >
                          <span className="flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-sm">{opt.icon}</span>
                            {opt.label}
                          </span>
                          {selectedTask.priority === opt.val && (
                            <span className="material-symbols-outlined text-xs">check</span>
                          )}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Tags</span>
                <div className="flex flex-col gap-1">
                  <div className="flex flex-wrap gap-1 mb-1 max-h-[60px] overflow-y-auto">
                    {selectedTask.tags && selectedTask.tags.map((tag, idx) => (
                      <span key={idx} className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-surface-variant border border-white/5 text-[9px] text-on-surface font-semibold uppercase">
                        {tag}
                        {(isAdmin || selectedTask.assigneeId === currentUserId) && (
                          <button
                            type="button"
                            onClick={() => {
                              const newTags = selectedTask.tags.filter(t => t !== tag);
                              handleUpdateTags(selectedTask.id, newTags);
                            }}
                            className="text-on-surface-variant hover:text-error font-bold ml-0.5 focus:outline-none"
                          >
                            ×
                          </button>
                        )}
                      </span>
                    ))}
                    {(!selectedTask.tags || selectedTask.tags.length === 0) && (
                      <span className="text-[10px] text-on-surface-variant/40 italic">No tags</span>
                    )}
                  </div>
                  {(isAdmin || selectedTask.assigneeId === currentUserId) && (
                    <input
                      type="text"
                      placeholder="Add tag + Enter..."
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const val = (e.target as HTMLInputElement).value.trim();
                          if (val && !selectedTask.tags?.includes(val)) {
                            const newTags = [...(selectedTask.tags || []), val];
                            handleUpdateTags(selectedTask.id, newTags);
                            (e.target as HTMLInputElement).value = '';
                          }
                        }
                      }}
                      className="bg-surface border border-white/10 rounded-lg px-2 py-1 text-[10px] focus:outline-none focus:border-primary text-on-surface w-full"
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Subtasks / Checklist Section */}
            <div className="flex flex-col gap-2.5 max-h-[220px] overflow-y-auto pr-1">
              <div className="flex justify-between items-center text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">
                <span className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm text-primary">checklist</span>
                  Checklist
                </span>
                
                {/* AI Checklist Breakdown Button */}
                {(isAdmin || selectedTask.assigneeId === currentUserId) && (
                  <button
                    onClick={handleAIBreakdown}
                    disabled={breakingDownTask}
                    className="flex items-center gap-1 px-2.5 py-1 bg-primary/10 hover:bg-primary/25 border border-primary/20 text-primary font-bold rounded-lg text-[9px] uppercase tracking-wide transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    title="Breakdown this task into subtasks using Gemini AI"
                  >
                    <span className="material-symbols-outlined text-[10px] animate-pulse">auto_awesome</span>
                    {breakingDownTask ? 'Breaking down...' : 'Breakdown (AI)'}
                  </button>
                )}

                <span>
                  {selectedTask.subtasks?.filter(s => s.isCompleted).length || 0}/
                  {selectedTask.subtasks?.length || 0} completed
                </span>
              </div>

              {selectedTask.subtasks && selectedTask.subtasks.length > 0 && (
                <div className="w-full h-1.5 bg-surface-container rounded-full overflow-hidden mb-1">
                  <div
                    className="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-300"
                    style={{
                      width: `${Math.round(
                        ((selectedTask.subtasks.filter(s => s.isCompleted).length || 0) /
                          (selectedTask.subtasks.length || 1)) *
                          100
                      )}%`
                    }}
                  ></div>
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                {selectedTask.subtasks && selectedTask.subtasks.map((subtask) => (
                  <div key={subtask.id} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-surface-variant/20 border border-white/5 hover:border-white/10 group">
                    <label className="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0">
                      <input
                        type="checkbox"
                        checked={subtask.isCompleted}
                        disabled={!isAdmin && selectedTask.assigneeId !== currentUserId}
                        onChange={() => toggleSubtask(subtask.id)}
                        className="w-4 h-4 rounded border border-white/10 bg-surface text-primary focus:ring-0 focus:ring-offset-0 cursor-pointer accent-primary"
                      />
                      <span className={`text-xs truncate ${subtask.isCompleted ? 'line-through text-on-surface-variant/50' : 'text-on-surface'}`}>
                        {subtask.title}
                      </span>
                    </label>
                    {(isAdmin || selectedTask.assigneeId === currentUserId) && (
                      <button
                        onClick={() => deleteSubtask(subtask.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-error/10 text-on-surface-variant hover:text-error transition-all"
                        title="Delete item"
                      >
                        <span className="material-symbols-outlined text-sm font-bold">delete</span>
                      </button>
                    )}
                  </div>
                ))}

                {(!selectedTask.subtasks || selectedTask.subtasks.length === 0) && (
                  <div className="text-center py-4 text-xs text-on-surface-variant/40 border border-dashed border-white/10 rounded-xl">
                    No sub-tasks added yet
                  </div>
                )}
              </div>

              {(isAdmin || selectedTask.assigneeId === currentUserId) && (
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="text"
                    placeholder="Add an item to the checklist..."
                    value={newSubtaskTitle}
                    onChange={(e) => setNewSubtaskTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addSubtask();
                      }
                    }}
                    className="flex-1 bg-surface border border-white/10 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-primary text-on-surface placeholder:text-on-surface-variant/45"
                  />
                  <button
                    onClick={addSubtask}
                    className="px-3.5 py-2 bg-primary hover:opacity-90 active:scale-95 text-background font-black rounded-xl text-xs transition-all flex items-center justify-center"
                  >
                    Add
                  </button>
                </div>
              )}
            </div>

            {/* Tabs for Comments vs Activities */}
            <div className="flex border-b border-white/10 mt-2">
              <button
                type="button"
                onClick={() => setDetailActiveTab('comments')}
                className={`flex-1 py-2 text-center text-xs font-bold transition-all border-b-2 ${
                  detailActiveTab === 'comments' ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant hover:text-on-surface'
                }`}
              >
                Comments ({comments.length})
              </button>
              <button
                type="button"
                onClick={() => setDetailActiveTab('activities')}
                className={`flex-1 py-2 text-center text-xs font-bold transition-all border-b-2 ${
                  detailActiveTab === 'activities' ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant hover:text-on-surface'
                }`}
              >
                Activity Log ({activities.length})
              </button>
            </div>

            <div className="flex-1 overflow-y-auto max-h-[220px] min-h-[140px] pr-1">
              {detailActiveTab === 'comments' ? (
                <div className="flex flex-col gap-3 h-full justify-between">
                  {/* Comments list */}
                  <div className="flex flex-col gap-2.5 overflow-y-auto max-h-[160px] pr-1">
                    {comments.map((comment) => (
                      <div key={comment.id} className="flex gap-2.5 items-start p-2 rounded-xl bg-surface-variant/20 border border-white/5">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary/30 to-secondary/30 flex items-center justify-center text-[10px] font-black text-primary border border-white/15 uppercase flex-shrink-0">
                          {comment.user.name ? comment.user.name.substring(0, 2) : '??'}
                        </div>
                        <div className="flex flex-col gap-1 min-w-0 flex-1">
                          <div className="flex justify-between items-center gap-2">
                            <span className="text-[10px] font-extrabold text-on-surface truncate">{comment.user.name}</span>
                            <span className="text-[8px] text-on-surface-variant/60 font-semibold flex-shrink-0">
                              {new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-xs text-on-surface-variant/95 leading-relaxed break-words">{renderCommentContent(comment.content)}</p>
                        </div>
                      </div>
                    ))}
                    {comments.length === 0 && (
                      <div className="text-center py-6 text-xs text-on-surface-variant/40 italic">
                        No comments yet. Start the conversation!
                      </div>
                    )}
                  </div>

                  {/* Add Comment Input Form */}
                  <div className="relative mt-auto pt-1">
                    {/* Mention Autocomplete Dropdown */}
                    {showMentionDropdown && filteredUsers.length > 0 && (
                      <div 
                        id="mention-dropdown"
                        className="absolute bottom-full left-0 mb-1 w-52 max-h-36 overflow-y-auto glass-card rounded-xl border border-white/10 shadow-2xl z-50 flex flex-col p-1.5 gap-0.5"
                      >
                        {filteredUsers.map((u, index) => (
                          <button
                            key={u.id}
                            type="button"
                            onClick={() => selectUserMention(u)}
                            className={`flex items-center gap-2 w-full text-left px-2 py-1.5 rounded-lg text-xs transition-colors ${
                              index === mentionDropdownIndex 
                                ? 'bg-primary/20 text-primary font-bold' 
                                : 'text-on-surface-variant hover:bg-white/5 hover:text-on-surface'
                            }`}
                          >
                            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-primary/30 to-secondary/30 flex items-center justify-center text-[8px] font-black uppercase text-primary border border-white/15">
                              {u.name ? u.name.substring(0, 2) : '??'}
                            </div>
                            <span className="truncate">{u.name}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    
                    <form onSubmit={handleAddComment} className="flex gap-2">
                      <input
                        id="comment-input"
                        type="text"
                        placeholder="Write a comment... (use @ to ping)"
                        value={newCommentText}
                        onChange={handleCommentChange}
                        onKeyDown={handleCommentKeyDown}
                        disabled={submittingComment}
                        className="flex-1 bg-surface border border-white/10 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-primary text-on-surface placeholder:text-on-surface-variant/45"
                        autoComplete="off"
                      />
                      <button
                        type="submit"
                        disabled={submittingComment || !newCommentText.trim()}
                        className="px-3.5 py-2 bg-primary hover:opacity-90 active:scale-95 text-background font-black rounded-xl text-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center cursor-pointer"
                      >
                        Post
                      </button>
                    </form>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-2 overflow-y-auto max-h-[200px] pr-1">
                  {/* Activities list */}
                  {activities.map((activity) => (
                    <div key={activity.id} className="flex gap-2 items-start text-xs p-1.5 rounded-lg hover:bg-surface-variant/10 transition-colors">
                      <span className="material-symbols-outlined text-sm text-on-surface-variant/60 mt-0.5">
                        {activity.action === 'STATUS_CHANGE' ? 'swap_horiz' :
                         activity.action === 'ASSIGNEE_CHANGE' ? 'person' :
                         activity.action === 'PRIORITY_CHANGE' ? 'warning' :
                         activity.action === 'TAGS_CHANGE' ? 'sell' : 'comment'}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-on-surface-variant leading-relaxed">
                          {activity.details}
                        </p>
                        <span className="text-[8px] text-on-surface-variant/50 font-bold block uppercase mt-0.5">
                          {new Date(activity.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })} at {new Date(activity.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  ))}
                  {activities.length === 0 && (
                    <div className="text-center py-6 text-xs text-on-surface-variant/40 italic">
                      No activity logs found.
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-between items-center text-xs text-on-surface-variant">
              <span className="flex items-center gap-1.5 font-semibold">
                <span className="material-symbols-outlined text-base">calendar_today</span>
                Due: {selectedTask.dueDate ? new Date(selectedTask.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'No date set'}
              </span>

              {isAdmin ? (
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
                  className="flex items-center gap-1.5 text-error hover:text-red-400 font-bold px-3 py-1.5 rounded-lg hover:bg-error/15 transition-colors"
                >
                  <span className="material-symbols-outlined text-sm font-bold">delete</span>
                  Delete Task
                </button>
              ) : (
                <div className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs">lock</span>
                  <span className="text-[10px] text-on-surface-variant/60 font-bold tracking-wide uppercase">
                    {selectedTask.assigneeId === currentUserId ? 'Assigned to you' : 'Read-only'}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==================== MODAL: AI PROJECT REPORT ==================== */}
      {isReportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-fade-in">
          <div className="glass-card w-full max-w-2xl rounded-2xl border border-white/10 p-6 shadow-2xl relative flex flex-col gap-4 max-h-[85vh]">
            <button
              onClick={() => setIsReportModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-white/10 text-on-surface-variant hover:text-on-surface transition-colors"
            >
              <span className="material-symbols-outlined">close</span>
            </button>

            <h3 className="text-lg font-bold flex items-center gap-2 border-b border-white/10 pb-3">
              <span className="material-symbols-outlined text-primary">psychology</span>
              AI Project Progress Report
            </h3>

            <div className="flex-1 overflow-y-auto pr-1">
              {generatingReport ? (
                <div className="flex flex-col items-center justify-center py-16 gap-4">
                  <div className="relative w-12 h-12">
                    <div className="absolute inset-0 rounded-full border-4 border-primary/20 animate-pulse"></div>
                    <div className="absolute inset-0 rounded-full border-4 border-t-primary animate-spin"></div>
                  </div>
                  <p className="text-on-surface-variant text-xs font-semibold animate-pulse">
                    Gemini AI is analyzing project tasks and compiling report...
                  </p>
                </div>
              ) : (
                <div className="space-y-1 bg-surface-container/20 p-5 rounded-xl border border-white/5 font-sans leading-relaxed">
                  {renderMarkdown(reportText)}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 border-t border-white/10 pt-3.5">
              {!generatingReport && reportText && (
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(reportText);
                    alert('Copied report to clipboard!');
                  }}
                  className="px-4 py-2 bg-surface-variant/40 hover:bg-surface-variant/70 border border-white/10 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">content_copy</span>
                  Copy Report
                </button>
              )}
              <button
                onClick={() => setIsReportModalOpen(false)}
                className="px-4 py-2 bg-primary text-background font-bold rounded-xl text-xs transition-all active:scale-95 cursor-pointer"
              >
                Close Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== GLOBAL TOAST NOTIFICATION ==================== */}
      {activeToast.visible && (
        <div className="fixed bottom-6 right-6 z-50 animate-slide-in">
          <div className="glass-card flex items-center gap-3 px-4 py-3 rounded-2xl border border-primary/30 shadow-lg glow-purple max-w-sm">
            <span className="material-symbols-outlined text-primary text-xl animate-bounce">notifications_active</span>
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-[10px] font-black text-primary uppercase tracking-wider">New Mention</span>
              <p className="text-xs text-on-surface-variant font-bold truncate mt-0.5">{activeToast.message}</p>
            </div>
            <button 
              onClick={() => setActiveToast({ message: '', visible: false })}
              className="text-on-surface-variant/60 hover:text-on-surface p-1 rounded-lg hover:bg-white/5 ml-2 transition-colors flex items-center justify-center cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">close</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
