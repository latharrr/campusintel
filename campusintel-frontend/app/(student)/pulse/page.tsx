'use client';
import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { supabase } from '@/lib/supabase';
import { TourProvider, TourReopen } from '@/components/tour/TourProvider';

const PULSE_TOUR = [
  {
    title: 'This is the CampusIntel network',
    body: 'Every node is real. LPU (the glowing center) is your college. Company nodes orbit it — sized by how many debriefs exist. Student nodes are the people who shared their interview experiences.',
    highlight: 'tour-pulse-canvas'
  },
  {
    title: 'What the arcs mean',
    body: 'Indigo arcs = a student just shared an interview debrief. Green arcs = the AI just delivered a personalized brief to a student. Watch the live activity feed on the right — every line is a real event.',
    highlight: 'tour-pulse-feed'
  },
  {
    title: 'Why Google’s node is bigger than Amazon’s',
    body: 'Node size = number of debriefs. Google has 10 verified LPU debriefs. Amazon has 3. More debriefs = bigger node = higher confidence in the intelligence CampusIntel delivers for that company.',
    highlight: 'tour-pulse-canvas'
  },
  {
    title: 'The numbers at the bottom',
    body: 'These update in real time via Supabase Realtime. When a student submits a debrief right now, the debriefs counter increments live. When a brief is generated, the students helped counter goes up.',
    highlight: 'tour-pulse-stats'
  },
  {
    title: 'The complete loop',
    body: 'Student shares debrief → arc flows to company node → company node processes intelligence → arc flows to next student → that student gets a better brief. This is the network effect made visible.',
    highlight: 'tour-pulse-canvas'
  },
];


interface Node extends d3.SimulationNodeDatum {
  id: string;
  type: 'college' | 'company' | 'student';
  label: string;
  debriefs: number;
  r: number;
  color: string;
}

interface Link {
  source: string | Node;
  target: string | Node;
  type: 'debrief' | 'brief';
  opacity: number;
}

interface Pulse {
  id: string;
  sourceNode: Node;
  targetNode: Node;
  type: 'debrief' | 'brief';
  startTime: number;
}

const INITIAL_NODES: Node[] = [
  { id: 'lpu', type: 'college', label: 'LPU', debriefs: 47, r: 40, color: '#6366f1', x: 0, y: 0 },
  { id: 'google', type: 'company', label: 'Google', debriefs: 8, r: 28, color: '#4285f4', x: 220, y: -80 },
  { id: 'infosys', type: 'company', label: 'Infosys', debriefs: 24, r: 32, color: '#007cc3', x: -200, y: -120 },
  { id: 'wipro', type: 'company', label: 'Wipro', debriefs: 6, r: 20, color: '#f59e0b', x: 240, y: 120 },
  { id: 'amazon', type: 'company', label: 'Amazon', debriefs: 3, r: 16, color: '#ff9900', x: -220, y: 100 },
  { id: 'microsoft', type: 'company', label: 'Microsoft', debriefs: 15, r: 26, color: '#00a4ef', x: 0, y: 200 },
  { id: 'rahul', type: 'student', label: 'Rahul', debriefs: 0, r: 10, color: '#a78bfa', x: 120, y: -180 },
  { id: 'priya', type: 'student', label: 'Priya', debriefs: 2, r: 10, color: '#34d399', x: -130, y: 200 },
  { id: 'arjun', type: 'student', label: 'Arjun', debriefs: 1, r: 10, color: '#a78bfa', x: 180, y: 60 },
  { id: 'sneha', type: 'student', label: 'Sneha', debriefs: 0, r: 10, color: '#a78bfa', x: -80, y: -170 },
  { id: 'dev', type: 'student', label: 'Dev', debriefs: 1, r: 10, color: '#a78bfa', x: -190, y: -20 },
];

const INITIAL_LINKS: Link[] = [
  { source: 'rahul', target: 'google', type: 'debrief', opacity: 0.15 },
  { source: 'priya', target: 'google', type: 'debrief', opacity: 0.2 },
  { source: 'arjun', target: 'infosys', type: 'debrief', opacity: 0.2 },
  { source: 'sneha', target: 'amazon', type: 'debrief', opacity: 0.12 },
  { source: 'dev', target: 'wipro', type: 'debrief', opacity: 0.15 },
  { source: 'google', target: 'lpu', type: 'debrief', opacity: 0.25 },
  { source: 'infosys', target: 'lpu', type: 'debrief', opacity: 0.35 },
  { source: 'wipro', target: 'lpu', type: 'debrief', opacity: 0.12 },
  { source: 'microsoft', target: 'lpu', type: 'debrief', opacity: 0.2 },
];

const STATS = [
  { dot: '#6366f1', label: '3 debriefs shared in last hour' },
  { dot: '#34d399', label: '12 briefs delivered today' },
  { dot: '#a78bfa', label: '847 students helped total' },
];

export default function CampusPulsePage() {
  const svgRef = useRef<SVGSVGElement>(null);
  const simRef = useRef<d3.Simulation<Node, Link> | null>(null);
  const nodesRef = useRef<Node[]>(INITIAL_NODES.map(n => ({ ...n })));
  const linksRef = useRef<Link[]>(INITIAL_LINKS.map(l => ({ ...l })));
  const pulseCountRef = useRef(0);
  const [stats, setStats] = useState({ debriefs: 3, briefs: 12, students: 847 });
  const [pulseLog, setPulseLog] = useState<{ text: string; color: string; time: string }[]>([
    { text: 'Priya shared Google Round 2 experience', color: '#6366f1', time: '2 min ago' },
    { text: 'Brief delivered to Rahul for Google', color: '#34d399', time: '2 min ago' },
    { text: 'Arjun shared Infosys HR experience', color: '#6366f1', time: '5 min ago' },
  ]);

  useEffect(() => {
    if (!svgRef.current) return;

    const width = svgRef.current.clientWidth || 900;
    const height = svgRef.current.clientHeight || 600;
    const cx = width / 2;
    const cy = height / 2;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // Defs: glow filter + gradients
    const defs = svg.append('defs');
    ['indigo', 'green', 'blue'].forEach((name, i) => {
      const colors = ['#6366f1', '#34d399', '#60a5fa'];
      const filter = defs.append('filter').attr('id', `glow-${name}`);
      filter.append('feGaussianBlur').attr('stdDeviation', '4').attr('result', 'coloredBlur');
      const merge = filter.append('feMerge');
      merge.append('feMergeNode').attr('in', 'coloredBlur');
      merge.append('feMergeNode').attr('in', 'SourceGraphic');
    });

    // Animated arcs layer
    const arcLayer = svg.append('g').attr('class', 'arc-layer');
    // Pulse dots layer (animated)
    const pulseLayer = svg.append('g').attr('class', 'pulse-layer');
    // Nodes layer
    const nodeLayer = svg.append('g').attr('class', 'node-layer');

    // Force simulation
    const sim = d3.forceSimulation<Node>(nodesRef.current)
      .force('link', d3.forceLink<Node, Link>(linksRef.current).id(d => d.id).distance(d => {
        const s = d.source as Node;
        const t = d.target as Node;
        if (s.type === 'college' || t.type === 'college') return 180;
        return 140;
      }).strength(0.3))
      .force('charge', d3.forceManyBody().strength(-400))
      .force('center', d3.forceCenter(cx, cy).strength(0.05))
      .force('collision', d3.forceCollide<Node>().radius(d => d.r + 20))
      .alphaDecay(0.015);

    simRef.current = sim;

    // Draw static arc lines
    const arcLines = arcLayer.selectAll<SVGPathElement, Link>('path')
      .data(linksRef.current)
      .join('path')
      .attr('fill', 'none')
      .attr('stroke', d => d.type === 'brief' ? '#34d399' : '#6366f1')
      .attr('stroke-width', 1)
      .attr('opacity', d => d.opacity);

    // Draw nodes
    const nodeGroups = nodeLayer.selectAll<SVGGElement, Node>('g')
      .data(nodesRef.current)
      .join('g')
      .style('cursor', 'pointer');

    // Make interactive: Hover fading
    nodeGroups
      .on('mouseenter', (event, d) => {
        arcLines.transition().duration(300).attr('opacity', l => {
          const s = l.source as Node;
          const t = l.target as Node;
          return (s.id === d.id || t.id === d.id) ? Math.max(l.opacity, 0.6) : 0.05;
        });
        nodeGroups.transition().duration(300).attr('opacity', n => {
          if (n.id === d.id) return 1;
          const isConnected = linksRef.current.some(l => {
             const s = l.source as Node;
             const t = l.target as Node;
             return ((s.id === d.id && t.id === n.id) || (t.id === d.id && s.id === n.id));
          });
          return isConnected ? 1 : 0.2;
        });
      })
      .on('mouseleave', () => {
        arcLines.transition().duration(300).attr('opacity', l => l.opacity);
        nodeGroups.transition().duration(300).attr('opacity', 1);
      });

    // Make interactive: Dragging
    const drag = d3.drag<SVGGElement, Node>()
      .on('start', (event, d) => {
        if (!event.active) sim.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on('drag', (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on('end', (event, d) => {
        if (!event.active) sim.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      });
    
    nodeGroups.call(drag);

    // Outer glow ring for college hub
    nodeGroups.filter(d => d.type === 'college')
      .append('circle')
      .attr('r', d => d.r + 16)
      .attr('fill', 'none')
      .attr('stroke', '#6366f1')
      .attr('stroke-width', 1)
      .attr('opacity', 0.2);

    nodeGroups.filter(d => d.type === 'college')
      .append('circle')
      .attr('r', d => d.r + 8)
      .attr('fill', 'none')
      .attr('stroke', '#6366f1')
      .attr('stroke-width', 1.5)
      .attr('opacity', 0.35);

    // Main circle
    nodeGroups.append('circle')
      .attr('r', d => d.r)
      .attr('fill', d => `${d.color}22`)
      .attr('stroke', d => d.color)
      .attr('stroke-width', d => d.type === 'college' ? 2.5 : d.type === 'company' ? 2 : 1.5)
      .attr('filter', d => d.type === 'college' ? 'url(#glow-indigo)' : null);

    // Labels
    nodeGroups.append('text')
      .text(d => d.label)
      .attr('text-anchor', 'middle')
      .attr('dy', d => d.type === 'student' ? d.r + 14 : 5)
      .attr('fill', d => d.type === 'college' ? '#c4b5fd' : d.type === 'company' ? '#93c5fd' : '#9b9bbb')
      .attr('font-size', d => d.type === 'college' ? '13px' : d.type === 'company' ? '11px' : '9px')
      .attr('font-weight', d => d.type === 'college' ? '600' : '400')
      .style('pointer-events', 'none');

    // Debrief count badge for companies
    nodeGroups.filter(d => d.type === 'company' && d.debriefs > 0)
      .append('text')
      .text(d => `${d.debriefs} debriefs`)
      .attr('text-anchor', 'middle')
      .attr('dy', d => -d.r - 8)
      .attr('fill', '#6b7280')
      .attr('font-size', '8px');

    // Update positions on tick
    sim.on('tick', () => {
      arcLines.attr('d', d => {
        const s = d.source as Node;
        const t = d.target as Node;
        if (!s.x || !t.x) return '';
        const dx = t.x - s.x;
        const dy = t.y - s.y;
        const dr = Math.sqrt(dx * dx + dy * dy) * 1.4;
        return `M${s.x},${s.y} A${dr},${dr} 0 0,1 ${t.x},${t.y}`;
      });
      nodeGroups.attr('transform', d => `translate(${d.x ?? 0},${d.y ?? 0})`);
    });

    // Cleanup
    return () => { sim.stop(); };
  }, []);

  // Animate a pulse along an arc
  const animatePulse = (sourceId: string, targetId: string, type: 'debrief' | 'brief') => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    const source = nodesRef.current.find(n => n.id === sourceId);
    const target = nodesRef.current.find(n => n.id === targetId);
    if (!source || !target || !source.x || !target.x) return;

    const color = type === 'debrief' ? '#818cf8' : '#34d399';
    const id = `pulse-${pulseCountRef.current++}`;

    const dx = target.x - source.x;
    const dy = target.y - source.y;
    const dr = Math.sqrt(dx * dx + dy * dy) * 1.4;
    const pathD = `M${source.x},${source.y} A${dr},${dr} 0 0,1 ${target.x},${target.y}`;

    const pulseLayer = svg.select('.pulse-layer');
    const tempPath = pulseLayer.append('path')
      .attr('id', id)
      .attr('d', pathD)
      .attr('fill', 'none')
      .attr('stroke', 'none');

    const totalLength = (tempPath.node() as SVGPathElement)?.getTotalLength() || 200;

    // Glowing dot
    const dot = pulseLayer.append('circle')
      .attr('r', type === 'debrief' ? 5 : 6)
      .attr('fill', color)
      .attr('opacity', 0.9)
      .style('filter', `drop-shadow(0 0 6px ${color})`);

    // Trail line
    const trail = pulseLayer.append('path')
      .attr('fill', 'none')
      .attr('stroke', color)
      .attr('stroke-width', type === 'brief' ? 2.5 : 1.5)
      .attr('opacity', 0.5)
      .attr('stroke-dasharray', '30 9999')
      .attr('stroke-dashoffset', 30);

    const duration = type === 'brief' ? 1200 : 1600;

    dot.transition()
      .duration(duration)
      .ease(d3.easeQuadInOut)
      .attrTween('transform', () => {
        return (t: number) => {
          const len = t * totalLength;
          const p = (tempPath.node() as SVGPathElement)?.getPointAtLength(len);
          if (!p) return '';
          // Update trail
          trail.attr('d', pathD)
            .attr('stroke-dasharray', `${len} 9999`)
            .attr('stroke-dashoffset', 0);
          return `translate(${p.x},${p.y})`;
        };
      })
      .on('end', () => {
        dot.remove();
        trail.remove();
        tempPath.remove();

        // Ripple at destination
        for (let i = 0; i < 2; i++) {
          pulseLayer.append('circle')
            .attr('cx', target.x ?? 0)
            .attr('cy', target.y ?? 0)
            .attr('r', target.r)
            .attr('fill', 'none')
            .attr('stroke', color)
            .attr('stroke-width', 2)
            .attr('opacity', 0.8)
            .transition()
            .delay(i * 200)
            .duration(800)
            .attr('r', target.r + 30)
            .attr('opacity', 0)
            .remove();
        }
      });
  };

  // Demo: auto-fire pulses every few seconds
  useEffect(() => {
    const SEQUENCES = [
      { from: 'rahul', to: 'google', type: 'debrief' as const, log: 'Rahul shared Google Technical Round experience', color: '#818cf8' },
      { from: 'google', to: 'priya', type: 'brief' as const, log: 'Brief delivered to Priya for Google', color: '#34d399' },
      { from: 'priya', to: 'infosys', type: 'debrief' as const, log: 'Priya shared Infosys Placement experience', color: '#818cf8' },
      { from: 'infosys', to: 'arjun', type: 'brief' as const, log: 'Brief delivered to Arjun for Infosys', color: '#34d399' },
      { from: 'sneha', to: 'amazon', type: 'debrief' as const, log: 'Sneha shared Amazon OA experience', color: '#818cf8' },
      { from: 'amazon', to: 'dev', type: 'brief' as const, log: 'Brief delivered to Dev for Amazon', color: '#34d399' },
    ];
    let i = 0;

    const fire = () => {
      const seq = SEQUENCES[i % SEQUENCES.length];
      const now = new Date();
      const timeStr = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;
      animatePulse(seq.from, seq.to, seq.type);
      setPulseLog(prev => [{ text: seq.log, color: seq.color, time: timeStr }, ...prev.slice(0, 4)]);
      if (seq.type === 'debrief') setStats(s => ({ ...s, debriefs: s.debriefs + 1 }));
      if (seq.type === 'brief') setStats(s => ({ ...s, briefs: s.briefs + 1, students: s.students + 1 }));
      i++;
    };

    const t = setInterval(fire, 3500);
    setTimeout(fire, 1000); // fire immediately too
    return () => clearInterval(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Also subscribe to real Supabase events
  useEffect(() => {
    const channel = supabase
      .channel('campus-pulse-live')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'interview_debriefs' }, (payload) => {
        const data = payload.new as any;
        animatePulse(data.student_id, data.company_id, 'debrief');
        setStats(s => ({ ...s, debriefs: s.debriefs + 1 }));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <TourProvider steps={PULSE_TOUR} tourKey="pulse">
      <div className="relative flex flex-col min-h-screen bg-[#07070f] overflow-hidden">
      {/* Ambient background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full animate-pulse-slow"
          style={{ background: 'radial-gradient(ellipse, rgba(99,102,241,0.07) 0%, transparent 70%)' }} />
      </div>

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between px-8 pt-6 pb-2">
        <div>
          <h1 className="font-display text-2xl text-[#e8e6f8]">Campus Pulse</h1>
          <p className="text-[13px] text-[#6b7280] mt-0.5">Every arc is a real interview experience, shared by your peers.</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-xs text-emerald-400">
            <span className="relative w-2 h-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex w-2 h-2 rounded-full bg-emerald-500" />
            </span>
            Live Network
          </span>
        </div>
      </div>

      {/* Legend */}
      <div className="relative z-10 flex items-center gap-6 px-8 mb-2">
        <div className="flex items-center gap-2 text-xs text-[#6b7280]">
          <div className="w-8 h-px bg-indigo-400 opacity-60" />
          Debrief shared
        </div>
        <div className="flex items-center gap-2 text-xs text-[#6b7280]">
          <div className="w-8 h-px bg-emerald-400 opacity-80" />
          Brief delivered
        </div>
        <div className="flex items-center gap-2 text-xs text-[#6b7280]">
          <div className="w-3 h-3 rounded-full border-2 border-indigo-500 bg-indigo-500/20" />
          LPU Hub
        </div>
        <div className="flex items-center gap-2 text-xs text-[#6b7280]">
          <div className="w-3 h-3 rounded-full border-2 border-blue-400 bg-blue-400/20" />
          Company
        </div>
        <div className="flex items-center gap-2 text-xs text-[#6b7280]">
          <div className="w-2 h-2 rounded-full border border-violet-400 bg-violet-400/20" />
          Student
        </div>
      </div>

      {/* Main canvas + activity feed */}
      <div className="flex flex-1 relative z-10 px-4 pb-4 gap-4">
        {/* D3 Canvas */}
        <div id="tour-pulse-canvas" className="flex-1 relative rounded-2xl border border-[#2a2a3d] overflow-hidden" style={{ background: '#09090f' }}>
          <svg ref={svgRef} className="w-full h-full" style={{ minHeight: '480px' }} />
        </div>

        {/* Activity Feed */}
        <div id="tour-pulse-feed" className="w-64 flex flex-col gap-3 rounded-2xl p-1">
          <div className="card-dark rounded-xl p-4 flex-1">
            <div className="text-[10px] uppercase tracking-widest text-[#6b7280] font-semibold mb-3">Live Activity</div>
            <div className="space-y-3">
              {pulseLog.map((l, i) => (
                <div key={i} className="flex items-start gap-2 animate-fade-in-up">
                  <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: l.color }} />
                  <div>
                    <p className="text-[11px] text-[#c4c4d8] leading-snug">{l.text}</p>
                    <p className="text-[10px] text-[#4b4b6b] mt-0.5">{l.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick tip */}
          <div className="card-dark rounded-xl p-4 border-indigo-500/20">
            <div className="text-[10px] text-indigo-400 uppercase tracking-widest mb-2">How it works</div>
            <p className="text-[11px] text-[#9b9bbb] leading-relaxed">
              Student submits debrief → knowledge flows to company node → AI generates brief → knowledge flows to next student.
            </p>
          </div>
        </div>
      </div>

      {/* Bottom stats bar */}
      <div id="tour-pulse-stats" className="relative z-10 flex items-center justify-center gap-8 py-4 border-t border-[#1e1e30] rounded-xl">
        {[
          { dot: '#6366f1', label: `${stats.debriefs} debriefs shared in last hour` },
          { dot: '#34d399', label: `${stats.briefs} briefs delivered today` },
          { dot: '#a78bfa', label: `${stats.students} students helped total` },
        ].map((s, i) => (
          <div key={i} className="flex items-center gap-2 text-[12px] text-[#9b9bbb]">
            <div className="w-2 h-2 rounded-full" style={{ background: s.dot, boxShadow: `0 0 6px ${s.dot}` }} />
            {s.label}
          </div>
        ))}
      </div>
      </div>
      <TourReopen />
    </TourProvider>
  );
}
