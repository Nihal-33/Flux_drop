import React, { useState, useEffect } from 'react';
import {
  Activity,
  Shield,
  KeyRound,
  Laptop,
  ArrowLeftRight,
  UploadCloud,
  Lock,
  Clock,
  RefreshCw,
} from 'lucide-react';
import { api } from '../../services/api';
import { ActivityItem } from '../../types';

export const ActivityPage: React.FC = () => {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchActivities = async () => {
    setLoading(true);
    try {
      const res = await api.activity.list();
      setActivities(res.activities);
    } catch (e) {
      console.warn('Error fetching activities:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();
  }, []);

  const getActivityIcon = (type: string) => {
    if (type.startsWith('auth:') || type.startsWith('security:')) {
      return <Lock className="w-4 h-4 text-cyan-400" />;
    }
    if (type.startsWith('pin:')) {
      return <KeyRound className="w-4 h-4 text-yellow-400" />;
    }
    if (type.startsWith('device:') || type.startsWith('pairing:')) {
      return <Laptop className="w-4 h-4 text-indigo-400" />;
    }
    if (type.startsWith('transfer:')) {
      return <ArrowLeftRight className="w-4 h-4 text-emerald-400" />;
    }
    if (type.startsWith('files:')) {
      return <UploadCloud className="w-4 h-4 text-blue-400" />;
    }
    return <Activity className="w-4 h-4 text-gray-400" />;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-heading font-bold text-white">Security & Audit Logs</h2>
          <p className="text-xs text-[#8B95A7] mt-1">
            Immutable chronological record of authenticated access, device authorizations, and transfers.
          </p>
        </div>

        <button
          onClick={fetchActivities}
          className="p-2 rounded-xl glass-card text-gray-400 hover:text-white transition"
          title="Refresh logs"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="rounded-3xl glass-panel border border-white/10 overflow-hidden shadow-2xl">
        {activities.length === 0 ? (
          <div className="p-12 text-center text-gray-500 text-xs">
            No activity logs recorded yet.
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {activities.map((act) => (
              <div key={act.id} className="p-4 sm:p-5 flex items-center justify-between hover:bg-white/[0.02] transition">
                <div className="flex items-center gap-3.5">
                  <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                    {getActivityIcon(act.type)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{act.title}</p>
                    <p className="text-[11px] text-gray-400 font-mono mt-0.5">
                      Type: <span className="text-gray-300">{act.type}</span>
                      {act.ipHash ? ` • Client ID: ${act.ipHash}` : ''}
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-xs text-gray-400 font-mono">
                    {new Date(act.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })} •{' '}
                    {new Date(act.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
