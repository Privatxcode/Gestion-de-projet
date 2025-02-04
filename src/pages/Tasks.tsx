import React, { useEffect, useState } from 'react';
import { Plus, Filter, Search, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { FileUpload } from '../components/FileUpload';

interface Task {
  id: string;
  title: string;
  description: string;
  status: 'todo' | 'in_progress' | 'review' | 'completed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  due_date: string;
}

interface TaskAttachment {
  id: string;
  task_id: string;
  name: string;
  file_url: string;
  file_type: string;
}

export function Tasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [attachments, setAttachments] = useState<Record<string, TaskAttachment[]>>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTask, setSelectedTask] = useState<string | null>(null);

  useEffect(() => {
    fetchTasks();
  }, []);

  useEffect(() => {
    if (selectedTask) {
      fetchTaskAttachments(selectedTask);
    }
  }, [selectedTask]);

  async function fetchTasks() {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .order('due_date', { ascending: true });

      if (error) throw error;
      if (data) setTasks(data);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchTaskAttachments(taskId: string) {
    try {
      const { data, error } = await supabase
        .from('task_attachments')
        .select('*')
        .eq('task_id', taskId);

      if (error) throw error;
      if (data) {
        setAttachments(prev => ({
          ...prev,
          [taskId]: data
        }));
      }
    } catch (error) {
      console.error('Error fetching task attachments:', error);
    }
  }

  const handleUploadComplete = async (taskId: string, fileUrl: string, fileName: string) => {
    try {
      const { error } = await supabase
        .from('task_attachments')
        .insert([
          {
            task_id: taskId,
            name: fileName,
            file_url: fileUrl,
            file_type: fileName.split('.').pop() || 'unknown'
          }
        ]);

      if (error) throw error;
      fetchTaskAttachments(taskId);
    } catch (error) {
      console.error('Error saving attachment:', error);
    }
  };

  const priorityColors = {
    low: 'bg-gray-100 text-gray-800',
    medium: 'bg-blue-100 text-blue-800',
    high: 'bg-yellow-100 text-yellow-800',
    urgent: 'bg-red-100 text-red-800',
  };

  const filteredTasks = tasks.filter(task =>
    task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    task.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">Loading tasks...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Tasks</h1>
        <button className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
          <Plus className="h-4 w-4 mr-2" />
          New Task
        </button>
      </div>

      <div className="flex space-x-4">
        <div className="flex-1 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
        </div>
        <button className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
          <Filter className="h-4 w-4 mr-2" />
          Filter
        </button>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {filteredTasks.map((task) => (
            <li key={task.id}>
              <div className="px-4 py-4 sm:px-6 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-gray-900 truncate">{task.title}</h4>
                    <p className="mt-1 text-sm text-gray-500 line-clamp-2">{task.description}</p>
                  </div>
                  <div className="ml-4 flex-shrink-0 flex space-x-2">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${priorityColors[task.priority]}`}>
                      {task.priority.toUpperCase()}
                    </span>
                    <span className="text-sm text-gray-500">
                      Due {new Date(task.due_date).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {/* Attachments section */}
                <div className="mt-4">
                  <button
                    onClick={() => setSelectedTask(selectedTask === task.id ? null : task.id)}
                    className="text-sm text-indigo-600 hover:text-indigo-900"
                  >
                    {selectedTask === task.id ? 'Hide attachments' : 'Show attachments'}
                  </button>

                  {selectedTask === task.id && (
                    <div className="mt-4 space-y-4">
                      <FileUpload
                        onUploadComplete={(fileUrl, fileName) => handleUploadComplete(task.id, fileUrl, fileName)}
                        bucket="task-attachments"
                        folder={task.id}
                      />

                      {attachments[task.id]?.length > 0 && (
                        <div className="mt-4">
                          <h5 className="text-sm font-medium text-gray-700 mb-2">Attached files</h5>
                          <ul className="space-y-2">
                            {attachments[task.id].map((attachment) => (
                              <li key={attachment.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                                <a
                                  href={attachment.file_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center space-x-2 text-sm text-indigo-600 hover:text-indigo-900"
                                >
                                  <span>{attachment.name}</span>
                                </a>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}