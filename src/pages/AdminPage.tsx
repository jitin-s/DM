import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Database,
  RefreshCw,
  Server,
  Layers,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Play,
} from 'lucide-react';
import { api } from '../services/api';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Link } from 'react-router-dom';

export const AdminPage: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [syncLogs, setSyncLogs] = useState<any[]>([]);
  const [mappings, setMappings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [syncingAniList, setSyncingAniList] = useState(false);
  const [syncingAnikoto, setSyncingAnikoto] = useState(false);
  const [syncingJikan, setSyncingJikan] = useState(false);
  const [syncingSchedule, setSyncingSchedule] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadAdminData = async () => {
    setIsLoading(true);
    try {
      const [statsRes, logsRes, mappingsRes] = await Promise.all([
        api.getAdminStats().catch(() => null),
        api.getAdminSyncLogs().catch(() => ({ logs: [] })),
        api.getAdminMappings().catch(() => ({ mappings: [] })),
      ]);

      if (statsRes) setStats(statsRes);
      if (logsRes?.logs) setSyncLogs(logsRes.logs);
      if (mappingsRes?.mappings) setMappings(mappingsRes.mappings);
    } catch (err: any) {
      console.warn('Admin fetch note:', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const handleTriggerAniListSync = async () => {
    setSyncingAniList(true);
    setMessage(null);
    try {
      await api.triggerAniListSync();
      setMessage({ type: 'success', text: 'Core library metadata synchronization triggered successfully!' });
      await loadAdminData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Core library sync failed' });
    } finally {
      setSyncingAniList(false);
    }
  };

  const handleTriggerAnikotoSync = async () => {
    setSyncingAnikoto(true);
    setMessage(null);
    try {
      await api.triggerAnikotoSync();
      setMessage({ type: 'success', text: 'Anikoto episode discovery synchronization finished!' });
      await loadAdminData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Anikoto sync failed' });
    } finally {
      setSyncingAnikoto(false);
    }
  };

  const handleTriggerJikanSync = async () => {
    setSyncingJikan(true);
    setMessage(null);
    try {
      await api.triggerJikanSync();
      setMessage({ type: 'success', text: 'Jikan metadata & cast enrichment synchronization finished!' });
      await loadAdminData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Jikan enrichment failed' });
    } finally {
      setSyncingJikan(false);
    }
  };

  const handleTriggerScheduleSync = async () => {
    setSyncingSchedule(true);
    setMessage(null);
    try {
      await api.triggerScheduleSync();
      setMessage({ type: 'success', text: 'Airing schedule synchronization completed!' });
      await loadAdminData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Schedule sync failed' });
    } finally {
      setSyncingSchedule(false);
    }
  };

  const handleToggleProvider = async (providerId: string, currentEnabled: boolean) => {
    try {
      await api.toggleProvider(providerId, !currentEnabled);
      await loadAdminData();
    } catch (err: any) {
      alert(`Failed to toggle provider: ${err.message}`);
    }
  };

  return (
    <div className="pt-24 sm:pt-28 pb-16 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-white/[0.08]">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#F01428] mb-1 font-display">
              <ShieldAlert className="w-4 h-4" /> Operations Console
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-white font-heading">
              Platform Administration
            </h1>
            <p className="text-sm text-[#9E9EB2] mt-1">
              Monitor metadata caching, trigger library pipelines, and manage streaming mappings.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              size="sm"
              icon={<RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />}
              onClick={loadAdminData}
            >
              Refresh
            </Button>
          </div>
        </div>

        {/* Notifications */}
        {message && (
          <div
            className={`p-4 rounded-xl flex items-center gap-3 text-sm ${
              message.type === 'success'
                ? 'bg-emerald-950/40 border border-emerald-800/50 text-emerald-200'
                : 'bg-red-950/40 border border-red-800/50 text-red-200'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        {/* 1. Statistics Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[#121218] border border-white/[0.08] rounded-2xl p-5 shadow-lg">
            <div className="flex items-center justify-between text-[#9E9EB2] mb-3">
              <span className="text-xs uppercase font-bold tracking-wider">Cached Anime</span>
              <Database className="w-4 h-4 text-[#F01428]" />
            </div>
            <div className="text-3xl font-black text-white font-heading">
              {stats?.stats?.totalAnime ?? '—'}
            </div>
            <div className="text-[11px] text-[#646478] mt-1">Synced to DevilMotion Library</div>
          </div>

          <div className="bg-[#121218] border border-white/[0.08] rounded-2xl p-5 shadow-lg">
            <div className="flex items-center justify-between text-[#9E9EB2] mb-3">
              <span className="text-xs uppercase font-bold tracking-wider">Indexed Episodes</span>
              <Layers className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-3xl font-black text-white font-heading">
              {stats?.stats?.totalEpisodes ?? '—'}
            </div>
            <div className="text-[11px] text-[#646478] mt-1">Available for streaming</div>
          </div>

          <div className="bg-[#121218] border border-white/[0.08] rounded-2xl p-5 shadow-lg">
            <div className="flex items-center justify-between text-[#9E9EB2] mb-3">
              <span className="text-xs uppercase font-bold tracking-wider">Active Streams</span>
              <Play className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-3xl font-black text-white font-heading">
              {stats?.stats?.totalStreams ?? '—'}
            </div>
            <div className="text-[11px] text-[#646478] mt-1">DevilMotion Streaming mapped</div>
          </div>

          <div className="bg-[#121218] border border-white/[0.08] rounded-2xl p-5 shadow-lg">
            <div className="flex items-center justify-between text-[#9E9EB2] mb-3">
              <span className="text-xs uppercase font-bold tracking-wider">Registered Accounts</span>
              <Users className="w-4 h-4 text-sky-400" />
            </div>
            <div className="text-3xl font-black text-white font-heading">
              {stats?.stats?.totalUsers ?? '—'}
            </div>
            <div className="text-[11px] text-[#646478] mt-1">Users & administrators</div>
          </div>
        </div>

        {/* 2. Manual Synchronization Triggers */}
        <div className="bg-[#121218] border border-white/[0.08] rounded-2xl p-6 shadow-xl">
          <h2 className="text-lg font-bold text-white font-heading mb-4 flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-[#F01428]" /> Manual Data Pipelines
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-[#181822] border border-white/5 flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold text-white font-heading">Core Library Catalog Sync</h3>
                <p className="text-xs text-[#9E9EB2] mt-1 leading-relaxed">
                  Fetches trending, popular, airing, and top-rated anime metadata, formats, release dates, and studios.
                </p>
              </div>
              <div className="pt-4">
                <Button
                  variant="primary"
                  size="sm"
                  disabled={syncingAniList}
                  onClick={handleTriggerAniListSync}
                  icon={<RefreshCw className={`w-3.5 h-3.5 ${syncingAniList ? 'animate-spin' : ''}`} />}
                >
                  {syncingAniList ? 'Syncing Library...' : 'Sync Core Library'}
                </Button>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#181822] border border-white/5 flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold text-white font-heading">Episode Discovery Sync</h3>
                <p className="text-xs text-[#9E9EB2] mt-1 leading-relaxed">
                  Discovers newly released episodes, extracts episode stream mappings, and verifies sub/dub availability.
                </p>
              </div>
              <div className="pt-4">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={syncingAnikoto}
                  onClick={handleTriggerAnikotoSync}
                  icon={<RefreshCw className={`w-3.5 h-3.5 ${syncingAnikoto ? 'animate-spin' : ''}`} />}
                >
                  {syncingAnikoto ? 'Discovering Episodes...' : 'Sync Episodes'}
                </Button>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#181822] border border-white/5 flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold text-white font-heading">Episode Information Enrichment</h3>
                <p className="text-xs text-[#9E9EB2] mt-1 leading-relaxed">
                  Enriches popular titles with Japanese titles, filler/recap flags, characters, and voice actor credits.
                </p>
              </div>
              <div className="pt-4">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={syncingJikan}
                  onClick={handleTriggerJikanSync}
                  icon={<RefreshCw className={`w-3.5 h-3.5 ${syncingJikan ? 'animate-spin' : ''}`} />}
                >
                  {syncingJikan ? 'Enriching Information...' : 'Enrich Metadata'}
                </Button>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#181822] border border-white/5 flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold text-white font-heading">Airing Schedule Sync</h3>
                <p className="text-xs text-[#9E9EB2] mt-1 leading-relaxed">
                  Updates the weekly simulcast timetable and broadcast times for the next 7 days.
                </p>
              </div>
              <div className="pt-4">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={syncingSchedule}
                  onClick={handleTriggerScheduleSync}
                  icon={<RefreshCw className={`w-3.5 h-3.5 ${syncingSchedule ? 'animate-spin' : ''}`} />}
                >
                  {syncingSchedule ? 'Updating Schedule...' : 'Trigger Schedule Sync'}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Streaming Provider Management */}
        <div className="bg-[#121218] border border-white/[0.08] rounded-2xl p-6 shadow-xl">
          <h2 className="text-lg font-bold text-white font-heading mb-4 flex items-center gap-2">
            <Server className="w-4 h-4 text-[#F01428]" /> Configured Streaming Adapters
          </h2>
          <div className="divide-y divide-white/5 text-sm">
            {stats?.providers?.map((prov: any) => (
              <div key={prov.id} className="py-3 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white">{prov.providerName}</span>
                    <Badge variant={prov.enabled ? 'green' : 'dark'} size="xs">
                      {prov.enabled ? 'ACTIVE' : 'DISABLED'}
                    </Badge>
                  </div>
                  <div className="text-xs text-[#9E9EB2] font-mono mt-0.5">{prov.providerBaseUrl}</div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-xs text-[#9E9EB2] text-right hidden sm:block">
                    <div>{prov._count?.episodeStreams || 0} Stream Links</div>
                    <div>{prov._count?.animeMappings || 0} Title Mappings</div>
                  </div>
                  <button
                    onClick={() => handleToggleProvider(prov.id, prov.enabled)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                      prov.enabled
                        ? 'bg-red-950/40 text-red-300 hover:bg-red-900/60 border border-red-800/40'
                        : 'bg-emerald-950/40 text-emerald-300 hover:bg-emerald-900/60 border border-emerald-800/40'
                    }`}
                  >
                    {prov.enabled ? 'Disable' : 'Enable'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 4. Episode Mapping Inspector */}
        <div className="bg-[#121218] border border-white/[0.08] rounded-2xl p-6 shadow-xl">
          <h2 className="text-lg font-bold text-white font-heading mb-4">
            Recent Title Mappings & Availability Status
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[#9E9EB2]">
              <thead className="bg-[#181822] text-white uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-2.5 px-3">Title</th>
                  <th className="py-2.5 px-3">Library ID</th>
                  <th className="py-2.5 px-3">Format</th>
                  <th className="py-2.5 px-3">Cached Eps</th>
                  <th className="py-2.5 px-3">Streams</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {mappings.slice(0, 10).map((m: any) => (
                  <tr key={m.id} className="hover:bg-white/[0.02]">
                    <td className="py-2.5 px-3 font-semibold text-white max-w-xs truncate">
                      {m.title}
                    </td>
                    <td className="py-2.5 px-3 font-mono">{m.anilistId}</td>
                    <td className="py-2.5 px-3">{m.format}</td>
                    <td className="py-2.5 px-3">{m.cachedEpisodes} / {m.totalEpisodes || '?'}</td>
                    <td className="py-2.5 px-3 font-semibold text-emerald-400">{m.mappedStreams}</td>
                    <td className="py-2.5 px-3">
                      <Badge
                        variant={m.status === 'AVAILABLE' ? 'green' : 'amber'}
                        size="xs"
                      >
                        {m.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 5. Synchronization Logs */}
        <div className="bg-[#121218] border border-white/[0.08] rounded-2xl p-6 shadow-xl">
          <h2 className="text-lg font-bold text-white font-heading mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#F01428]" /> Background Sync Logs
          </h2>
          <div className="space-y-2">
            {syncLogs.length === 0 ? (
              <p className="text-xs text-[#646478]">No sync runs recorded yet.</p>
            ) : (
              syncLogs.map(log => (
                <div
                  key={log.id}
                  className="p-3 rounded-xl bg-[#181822] border border-white/5 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-3">
                    <Badge variant={log.status === 'SUCCESS' ? 'green' : 'red'} size="xs">
                      {log.status}
                    </Badge>
                    <div>
                      <span className="font-bold text-white">{log.syncType}</span>
                      <span className="text-[#646478] ml-2">
                        {new Date(log.startedAt).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>

                  <div className="text-[#9E9EB2]">
                    Processed: <strong className="text-white">{log.itemsProcessed}</strong> | Added: <strong className="text-emerald-400">{log.itemsAdded}</strong>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
