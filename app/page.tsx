'use client';

import { useEffect, useState } from 'react';
import Header from './components/Header';
import NavTabs from './components/NavTabs';
import KPICard from './components/KPICard';
import TrendChart from './components/TrendChart';
import ToolChart from './components/ToolChart';
import TeamTable from './components/TeamTable';
import AlertBox from './components/AlertBox';
import TokenPool from './components/TokenPool';
import DeptChart from './components/DeptChart';
import RankChart from './components/RankChart';
import SkillLibrary from './components/SkillLibrary';
import CostHistChart from './components/CostHistChart';
import CostDeptChart from './components/CostDeptChart';
import ContribChart from './components/ContribChart';
import type { TeamMember } from './components/TeamTable';
import {
  fetchSkillLibrary,
  getAuthorColor,
  getAuthorDepartment,
  getAuthorName,
  getTeamMemberStats,
  getToolDistribution,
  getTotalTokensUsed,
} from '@/lib/supabase-queries';

const defaultSkillsData = [
  {
    icon: '📧',
    name: 'Email Sales Automation',
    meta: 'Linh · Marketing',
    uses: 47,
    saved: '3.2h/tuần',
  },
  {
    icon: '📊',
    name: 'Báo cáo KPI tự động',
    meta: 'Huy · Dev',
    uses: 38,
    saved: '5h/tuần',
  },
  {
    icon: '🎯',
    name: 'Content Brief Generator',
    meta: 'Phương · Marketing',
    uses: 31,
    saved: '2.5h/tuần',
  },
  {
    icon: '📝',
    name: 'Meeting Summary → Action',
    meta: 'Trang · Ops',
    uses: 28,
    saved: '1.8h/tuần',
  },
  {
    icon: '💬',
    name: 'Customer Reply Template',
    meta: 'Nam · Sales',
    uses: 22,
    saved: '2h/tuần',
  },
];

const sopData = [
  { icon: '🔁', name: 'Quy trình onboard khách hàng mới', meta: 'Ops · v2.1', uses: 14 },
  { icon: '📣', name: 'Campaign launch checklist AI', meta: 'Marketing · v1.3', uses: 11 },
  { icon: '🐛', name: 'Bug report → Fix pipeline', meta: 'Dev · v3.0', uses: 19 },
  { icon: '📈', name: 'Weekly revenue report flow', meta: 'CEO · v1.0', uses: 8 },
  { icon: '🤝', name: 'Deal closing prompt series', meta: 'Sales · v2.4', uses: 16 },
];

const experienceData = [
  {
    avatar: 'HV',
    color: '#34d399',
    name: 'Huy',
    text: 'Dùng chain-of-thought cho debug giảm 60% thời gian review code!',
    time: '2h trước',
  },
  {
    avatar: 'LN',
    color: '#818cf8',
    name: 'Linh',
    text: 'Prompt 3 bước cho copywriting Facebook tăng CTR lên 2.4x 🔥',
    time: '5h trước',
  },
  {
    avatar: 'TT',
    color: '#fbbf24',
    name: 'Trang',
    text: 'Claude phân tích contract nhanh hơn 10x so với đọc tay.',
    time: 'Hôm qua',
  },
];

const fallbackDepartments = ['Sales', 'Dev', 'Marketing', 'Ops', 'Design'];

function hashString(value: string) {
  return value.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
}

function makeAvatar(name: string) {
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return words.map((word) => word[0]).join('').slice(0, 2).toUpperCase();
}

function formatCompactNumber(value: number) {
  return new Intl.NumberFormat('en', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: value >= 1000 ? 0 : 2,
  }).format(value);
}

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [activePeriod, setActivePeriod] = useState('30d');
  const [totalTokens, setTotalTokens] = useState(4200000);
  const [monthlyCost, setMonthlyCost] = useState(284);
  const [teamMembers, setTeamMembers] = useState<TeamMember[] | undefined>(undefined);
  const [toolItems, setToolItems] = useState<{ label: string; value: number }[] | undefined>(undefined);
  const [skillsData, setSkillsData] = useState(defaultSkillsData);

  useEffect(() => {
    let cancelled = false;

    async function loadDashboardData() {
      try {
        const [tokens, teamStats, toolStats, skills] = await Promise.all([
          getTotalTokensUsed(),
          getTeamMemberStats(),
          getToolDistribution(),
          fetchSkillLibrary(),
        ]);

        if (cancelled) return;

        if (tokens > 0) {
          setTotalTokens(tokens);
          setMonthlyCost(tokens * 0.015);
        }

        if (teamStats.length > 0) {
          const mappedMembers: TeamMember[] = teamStats.map((member) => {
            const seed = hashString(member.author_id);
            const name = getAuthorName(member.author_id);
            const budget = 1000000;
            const score = Number((7 + (seed % 31) / 10).toFixed(1));
            const usagePct = member.total_tokens / budget;

            return {
              name,
              avatar: makeAvatar(name),
              color: getAuthorColor(member.author_id),
              dept:
                getAuthorDepartment(member.author_id) === 'Unknown'
                  ? fallbackDepartments[seed % fallbackDepartments.length]
                  : getAuthorDepartment(member.author_id),
              used: member.total_tokens,
              budget,
              cost: member.total_tokens * 0.015,
              tasks: 50 + (seed % 151),
              skills: 1 + (seed % 11),
              score,
              status: usagePct >= 0.9 ? 'red' : score < 7.5 ? 'yellow' : 'green',
            };
          });

          setTeamMembers(mappedMembers);
        }

        if (toolStats.length > 0) {
          setToolItems(
            toolStats.map((tool) => ({
              label: tool.ai_tool || 'Unknown',
              value: tool.total_tokens,
            }))
          );
        }

        if (skills.length > 0) {
          setSkillsData(
            skills.map((skill, idx) => ({
              icon: '💡',
              name: skill.title,
              meta: `${getAuthorName(skill.author_id)} · ${skill.category || 'Prompt'}`,
              uses: 10 + ((hashString(skill.title) + idx) % 40),
              saved: `${1 + ((hashString(skill.prompt_content || skill.title) + idx) % 5)}h/tuần`,
            }))
          );
        }
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      }
    }

    loadDashboardData();

    return () => {
      cancelled = true;
    };
  }, []);

  const navTabs = [
    { id: 'overview', label: 'Tổng quan', icon: '📊' },
    { id: 'team', label: 'Team', icon: '👥' },
    { id: 'cost', label: 'Chi phí', icon: '💰' },
    { id: 'skills', label: 'Skill Library', icon: '💡' },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Header onPeriodChange={setActivePeriod} activePeriod={activePeriod} />
      <NavTabs tabs={navTabs} activeTab={activeTab} onTabChange={setActiveTab} />

      {/* OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <main className="p-5 space-y-4 max-w-7xl mx-auto">
          {/* KPI ROW */}
          <div className="grid grid-cols-5 gap-3">
            <KPICard label="Tổng Token Dùng" value={formatCompactNumber(totalTokens)} subtext="Dữ liệu từ Supabase" trend="up" accentColor="#4f46e5" />
            <KPICard label="Chi Phí AI / Tháng" value={formatCurrency(monthlyCost)} subtext="Token thật × $0.015" trend="down" accentColor="#10b981" />
            <KPICard label="Team Adoption Rate" value="87%" subtext="13 thành viên active" trend="up" accentColor="#f59e0b" />
            <KPICard label="Productivity Score" value="8.4/10" subtext="0.6 điểm so với Q1" trend="up" accentColor="#8b5cf6" />
            <KPICard label="Token Còn Dư Pool" value="1.8M" subtext="Sẵn để phân phối lại" trend="neutral" accentColor="#06b6d4" />
          </div>

          {/* CHARTS ROW */}
          <div className="grid grid-cols-2 gap-4">
            <TrendChart />
            <ToolChart items={toolItems} />
          </div>

          {/* BOTTOM ROW */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-slate-900 border border-slate-700 rounded-lg p-4.5">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3.5">
                Top thành viên — Token usage tháng này
              </h3>
              <TeamTable limit={6} members={teamMembers} />
            </div>

            <div className="bg-slate-900 border border-slate-700 rounded-lg p-4.5">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3.5">Cảnh báo & Gợi ý</h3>
              <div className="space-y-2">
                <AlertBox type="warn" icon="⚠️" title="Minh (Sales) sắp hết quota" message="— còn 8% token. Cân nhắc chuyển 200k token từ pool." />
                <AlertBox type="info" icon="💡" title="3 prompt cao điểm từ Marketing" message="tuần này — chưa được share lên Skill Library." />
                <AlertBox type="success" icon="✅" title="Chi phí tháng này thấp hơn $38" message="vs dự báo nhờ tối ưu model GPT-4→Haiku." />
                <AlertBox type="info" icon="📊" title="Design team chưa dùng Claude" message="— tiềm năng tăng năng suất 2-3x." />
              </div>
            </div>

            <TokenPool />
          </div>
        </main>
      )}

      {/* TEAM TAB */}
      {activeTab === 'team' && (
        <main className="p-5 space-y-4 max-w-7xl mx-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-lg p-4.5">
            <h3 className="text-sm font-semibold text-slate-100 mb-3.5">👥 Hiệu suất AI theo từng thành viên</h3>
            <TeamTable fullView={true} members={teamMembers} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <DeptChart />
            <RankChart />
          </div>
        </main>
      )}

      {/* COST TAB */}
      {activeTab === 'cost' && (
        <main className="p-5 space-y-4 max-w-7xl mx-auto">
          {/* KPI ROW */}
          <div className="grid grid-cols-5 gap-3">
            <KPICard label="Chi phí tháng này" value="$284" subtext="$38 vs dự báo" trend="down" accentColor="#4f46e5" />
            <KPICard label="Chi phí / nhân viên" value="$18.9" subtext="15 người active" trend="neutral" accentColor="#10b981" />
            <KPICard label="Tiết kiệm tối ưu" value="$142" subtext="Chuyển đổi model" trend="up" accentColor="#f59e0b" />
            <KPICard label="Cost/Task hoàn thành" value="$0.34" subtext="28% vs Q1" trend="down" accentColor="#8b5cf6" />
            <KPICard label="Dự báo tháng tới" value="$310" subtext="9% do team expand" trend="neutral" accentColor="#06b6d4" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <CostHistChart />
            <CostDeptChart />
          </div>

          <div className="bg-slate-900 border border-slate-700 rounded-lg p-4.5">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3.5">
              💡 Đề xuất tối ưu chi phí từ AI
            </h3>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-blue-950 border border-blue-800 rounded-lg p-3.5">
                <div className="text-xs font-bold text-blue-400 mb-1.5">🔄 Chuyển đổi model</div>
                <div className="text-xs text-slate-400 leading-relaxed">
                  Sales đang dùng GPT-4o cho task tóm tắt email. Chuyển sang Claude Haiku tiết kiệm <strong className="text-emerald-400">~$45/tháng</strong>.
                </div>
              </div>
              <div className="bg-emerald-950 border border-emerald-800 rounded-lg p-3.5">
                <div className="text-xs font-bold text-emerald-400 mb-1.5">♻️ Dùng lại Prompt</div>
                <div className="text-xs text-slate-400 leading-relaxed">
                  3 team đang viết prompt tương tự nhau. Share 1 prompt chuẩn giảm <strong className="text-emerald-400">~30% token</strong> tiêu thụ.
                </div>
              </div>
              <div className="bg-amber-950 border border-amber-800 rounded-lg p-3.5">
                <div className="text-xs font-bold text-amber-400 mb-1.5">⏰ Off-peak Usage</div>
                <div className="text-xs text-slate-400 leading-relaxed">
                  Khuyến khích chạy batch task lúc 6-8am. Giảm tải peak giờ hành chính, tối ưu rate limit.
                </div>
              </div>
            </div>
          </div>
        </main>
      )}

      {/* SKILLS TAB */}
      {activeTab === 'skills' && (
        <main className="p-5 space-y-4 max-w-7xl mx-auto">
          <div className="grid grid-cols-2 gap-4">
            <SkillLibrary title="🏆 Top Prompts & Skills được dùng nhiều nhất" items={skillsData} showSaved={true} />
            <SkillLibrary title="📚 SOP & Workflow Templates" items={sopData} showSaved={false} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <ContribChart />
            <div className="bg-slate-900 border border-slate-700 rounded-lg p-4.5">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3.5">
                💬 Chia sẻ kinh nghiệm gần đây
              </h3>
              <div className="space-y-2">
                {experienceData.map((exp, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 py-2 border-b border-slate-800 last:border-b-0">
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                      style={{ background: exp.color + '33', color: exp.color }}
                    >
                      {exp.avatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-slate-200">
                        {exp.name} <span className="text-slate-500 font-normal">· {exp.time}</span>
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">{exp.text}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      )}
    </div>
  );
}
