import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Megaphone, Sparkles, Copy, Check, ChevronDown, ChevronUp,
  RefreshCw, Lightbulb, Target, Users, Zap, BookOpen, BarChart3,
} from 'lucide-react';
import { useAppStore } from '@/store';
import { cn } from '@/components/ui-elements';

// ── Types ────────────────────────────────────────────────────────────────────

interface Platform {
  key: string;
  name: string;
  icon: string;
  charLimits: { headline: number; body: number; description: number };
}

interface Framework {
  key: string;
  name: string;
  description: string;
}

interface AdVariation {
  variation: number;
  framework_used: string;
  hook: string;
  headline: string;
  body: string;
  cta: string;
  description: string;
  copywriter_notes: string;
}

// ── Static config ─────────────────────────────────────────────────────────────

const TONES = [
  'Professional', 'Direct & Bold', 'Conversational', 'Urgent',
  'Inspirational', 'Storytelling', 'Educational', 'Humorous',
];

const AD_TYPES: Record<string, string[]> = {
  meta:          ['Image Ad', 'Video Ad', 'Carousel', 'Story', 'Lead Form'],
  google_search: ['Responsive Search Ad', 'Dynamic Search Ad', 'Call-Only'],
  linkedin:      ['Single Image', 'Video Ad', 'Carousel', 'Sponsored Message', 'Lead Gen Form'],
  tiktok:        ['In-Feed Ad', 'TopView', 'Branded Hashtag', 'Spark Ad'],
  youtube:       ['Skippable In-Stream', 'Non-Skippable', 'Bumper (6s)', 'Discovery'],
  instagram:     ['Feed Image', 'Reel', 'Story', 'Carousel', 'Shopping'],
};

const PLATFORM_COLORS: Record<string, string> = {
  meta:          '#1877F2',
  google_search: '#EA4335',
  linkedin:      '#0A66C2',
  tiktok:        '#FF0050',
  youtube:       '#FF0000',
  instagram:     '#E1306C',
};

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.07 } } };
const item      = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } };

// ── Helpers ───────────────────────────────────────────────────────────────────

function CharBadge({ value, limit, label }: { value: string; limit: number; label: string }) {
  const len = value?.length ?? 0;
  const pct = Math.min(len / limit, 1);
  const color = len > limit ? 'text-red-400' : len > limit * 0.85 ? 'text-amber-400' : 'text-white/30';
  return (
    <span className={cn("text-[10px] font-mono tabular-nums", color)}>
      {label}: {len}/{limit}
    </span>
  );
}

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };
  return (
    <button
      onClick={copy}
      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-white/40 hover:text-white text-[11px] font-medium transition-all"
    >
      {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

// ── Ad Variation Card ─────────────────────────────────────────────────────────

function AdCard({ ad, platform, platforms }: { ad: AdVariation; platform: string; platforms: Platform[] }) {
  const [expanded, setExpanded] = useState(true);
  const platformData = platforms.find(p => p.key === platform);
  const color = PLATFORM_COLORS[platform] ?? '#6366f1';

  const angleLabels: Record<number, string> = {
    1: 'Pain-Led',
    2: 'Dream Outcome',
    3: 'Proof & Credibility',
    4: 'Curiosity / Contrarian',
    5: 'Story-Led',
  };

  const fullCopy = [
    ad.hook && `HOOK:\n${ad.hook}`,
    ad.headline && `HEADLINE:\n${ad.headline}`,
    ad.body && `BODY:\n${ad.body}`,
    ad.description && `DESCRIPTION:\n${ad.description}`,
    ad.cta && `CTA:\n${ad.cta}`,
  ].filter(Boolean).join('\n\n');

  return (
    <motion.div variants={item} className="bg-[#111520] border border-white/6 rounded-2xl overflow-hidden">
      {/* Card header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-bold" style={{ background: `${color}22`, color }}>
            {ad.variation}
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Variation {ad.variation} — {angleLabels[ad.variation] ?? 'Alternative Angle'}</p>
            <p className="text-[11px] text-white/30">{ad.framework_used} Framework</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <CopyBtn text={fullCopy} />
          <button onClick={() => setExpanded(e => !e)} className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center text-white/30 hover:text-white transition-all">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-5 py-4 space-y-4">

              {/* Hook */}
              {ad.hook && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[10px] font-semibold text-white/40 uppercase tracking-wider flex items-center gap-1.5">
                      <Zap className="w-3 h-3 text-amber-400" /> Hook / Thumb-Stop
                    </label>
                    <CopyBtn text={ad.hook} />
                  </div>
                  <p className="text-sm text-white leading-relaxed bg-amber-500/5 border border-amber-500/10 rounded-xl px-4 py-3">{ad.hook}</p>
                </div>
              )}

              {/* Headline */}
              {ad.headline && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-3">
                      <label className="text-[10px] font-semibold text-white/40 uppercase tracking-wider">Headline</label>
                      {platformData && <CharBadge value={ad.headline} limit={platformData.charLimits.headline} label="chars" />}
                    </div>
                    <CopyBtn text={ad.headline} />
                  </div>
                  <p className="text-sm font-semibold text-white bg-white/3 border border-white/5 rounded-xl px-4 py-3">{ad.headline}</p>
                </div>
              )}

              {/* Body Copy */}
              {ad.body && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-3">
                      <label className="text-[10px] font-semibold text-white/40 uppercase tracking-wider">Body Copy</label>
                      {platformData && <CharBadge value={ad.body} limit={platformData.charLimits.body} label="chars" />}
                    </div>
                    <CopyBtn text={ad.body} />
                  </div>
                  <p className="text-sm text-white/80 leading-relaxed whitespace-pre-line bg-white/3 border border-white/5 rounded-xl px-4 py-3">{ad.body}</p>
                </div>
              )}

              {/* Description */}
              {ad.description && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-3">
                      <label className="text-[10px] font-semibold text-white/40 uppercase tracking-wider">Description</label>
                      {platformData && <CharBadge value={ad.description} limit={platformData.charLimits.description} label="chars" />}
                    </div>
                    <CopyBtn text={ad.description} />
                  </div>
                  <p className="text-sm text-white/70 bg-white/3 border border-white/5 rounded-xl px-4 py-2.5">{ad.description}</p>
                </div>
              )}

              {/* CTA */}
              {ad.cta && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[10px] font-semibold text-white/40 uppercase tracking-wider flex items-center gap-1.5">
                      <Target className="w-3 h-3 text-primary" /> Call to Action
                    </label>
                    <CopyBtn text={ad.cta} />
                  </div>
                  <div className="inline-flex items-center px-4 py-2 rounded-xl font-semibold text-sm text-white" style={{ background: `${color}22`, border: `1px solid ${color}33`, color }}>
                    {ad.cta}
                  </div>
                </div>
              )}

              {/* Copywriter Notes */}
              {ad.copywriter_notes && (
                <div className="flex gap-3 p-3 rounded-xl bg-primary/5 border border-primary/10">
                  <Lightbulb className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-white/55 leading-relaxed">{ad.copywriter_notes}</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AdsPage() {
  const { account } = useAppStore();
  const businessTag = account?.businessTag ?? 'general';

  const [platforms, setPlatforms]   = useState<Platform[]>([]);
  const [frameworks, setFrameworks] = useState<Framework[]>([]);

  const [platform,      setPlatform]      = useState('meta');
  const [adType,        setAdType]        = useState('');
  const [framework,     setFramework]     = useState('aida');
  const [product,       setProduct]       = useState('');
  const [audience,      setAudience]      = useState('');
  const [usp,           setUsp]           = useState('');
  const [painPoint,     setPainPoint]     = useState('');
  const [cta,           setCta]           = useState('');
  const [tone,          setTone]          = useState('Professional');
  const [variations,    setVariations]    = useState(3);

  const [generating, setGenerating] = useState(false);
  const [results,    setResults]    = useState<AdVariation[]>([]);
  const [error,      setError]      = useState('');

  useEffect(() => {
    fetch('/api/ads/platforms').then(r => r.json()).then(setPlatforms).catch(() => {});
    fetch('/api/ads/frameworks').then(r => r.json()).then(setFrameworks).catch(() => {});
  }, []);

  const adTypes = AD_TYPES[platform] ?? [];
  const currentPlatform = platforms.find(p => p.key === platform);
  const platformColor = PLATFORM_COLORS[platform] ?? '#6366f1';

  const handleGenerate = async () => {
    if (!product.trim()) { setError('Please describe your product or service.'); return; }
    setError('');
    setGenerating(true);
    setResults([]);
    try {
      const res = await fetch('/api/ads/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessTag, platform, adType, framework,
          product, targetAudience: audience, usp, painPoint,
          callToAction: cta, tone, variations,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Generation failed');
      setResults(data.ads ?? []);
    } catch (e: any) {
      setError(e.message ?? 'Something went wrong');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto">

      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="sticky top-0 z-10 px-4 sm:px-8 pt-4 sm:pt-8 pb-4 sm:pb-5 bg-[#0c0e16]/90 backdrop-blur-md border-b border-white/5">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-display font-bold text-white flex items-center gap-2">
              <Megaphone className="w-5 h-5 sm:w-6 sm:h-6 text-primary" /> Ad Creator
            </h1>
            <p className="hidden sm:block text-sm text-white/35 mt-0.5">
              AI ad copy using proven methods from Ogilvy, Halbert, Kennedy & Hormozi
            </p>
          </div>
          {results.length > 0 && (
            <button
              onClick={() => { setResults([]); }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 border border-white/8 text-white/50 hover:text-white text-xs font-medium transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" /> New Ad
            </button>
          )}
        </div>
      </div>

      <div className="px-4 sm:px-8 py-5 sm:py-8 max-w-5xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

          {/* ── Left: Form ───────────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-5">

            {/* Platform Selector */}
            <div className="bg-[#111520] border border-white/6 rounded-2xl p-4">
              <label className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3 block flex items-center gap-1.5">
                <BarChart3 className="w-3.5 h-3.5" /> Platform
              </label>
              <div className="grid grid-cols-2 gap-2">
                {platforms.map(p => (
                  <button
                    key={p.key}
                    onClick={() => { setPlatform(p.key); setAdType(''); }}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium border transition-all",
                      platform === p.key
                        ? "text-white border-transparent"
                        : "text-white/40 border-white/6 bg-white/3 hover:text-white/70 hover:bg-white/5"
                    )}
                    style={platform === p.key ? { background: `${PLATFORM_COLORS[p.key]}22`, borderColor: `${PLATFORM_COLORS[p.key]}44`, color: PLATFORM_COLORS[p.key] } : {}}
                  >
                    <span>{p.icon}</span>
                    <span className="truncate text-xs">{p.name}</span>
                  </button>
                ))}
              </div>

              {adTypes.length > 0 && (
                <div className="mt-3">
                  <label className="text-[10px] text-white/30 uppercase tracking-wider mb-1.5 block">Ad Type</label>
                  <div className="flex flex-wrap gap-1.5">
                    {adTypes.map(t => (
                      <button
                        key={t}
                        onClick={() => setAdType(adType === t ? '' : t)}
                        className={cn(
                          "px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all",
                          adType === t ? "text-white border-transparent" : "text-white/35 border-white/6 bg-white/3 hover:text-white/60"
                        )}
                        style={adType === t ? { background: `${platformColor}22`, borderColor: `${platformColor}44`, color: platformColor } : {}}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Framework */}
            <div className="bg-[#111520] border border-white/6 rounded-2xl p-4">
              <label className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3 block flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5" /> Advertising Framework
              </label>
              <div className="space-y-1.5">
                {frameworks.map(fw => (
                  <button
                    key={fw.key}
                    onClick={() => setFramework(fw.key)}
                    className={cn(
                      "w-full text-left px-3 py-2.5 rounded-xl border transition-all",
                      framework === fw.key
                        ? "bg-primary/10 border-primary/30 text-white"
                        : "border-white/5 bg-white/2 text-white/40 hover:text-white/70 hover:bg-white/5"
                    )}
                  >
                    <p className="text-xs font-semibold">{fw.name}</p>
                    <p className="text-[10px] text-white/30 mt-0.5 leading-tight">{fw.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Variations count */}
            <div className="bg-[#111520] border border-white/6 rounded-2xl p-4">
              <label className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3 block">
                Variations to Generate
              </label>
              <div className="flex gap-2">
                {[2, 3, 4, 5].map(n => (
                  <button
                    key={n}
                    onClick={() => setVariations(n)}
                    className={cn(
                      "flex-1 py-2 rounded-xl text-sm font-semibold border transition-all",
                      variations === n
                        ? "bg-primary/15 border-primary/30 text-primary"
                        : "border-white/6 bg-white/3 text-white/40 hover:text-white/70"
                    )}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ── Right: Inputs + Results ──────────────────────────── */}
          <div className="lg:col-span-3 space-y-5">

            {/* Campaign Details */}
            <div className="bg-[#111520] border border-white/6 rounded-2xl p-5 space-y-4">
              <label className="text-xs font-semibold text-white/50 uppercase tracking-wider block flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5" /> Campaign Details
              </label>

              <div>
                <label className="text-xs text-white/40 mb-1.5 block">
                  Product / Service <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={product}
                  onChange={e => setProduct(e.target.value)}
                  placeholder="e.g. Home inspection service for real estate agents — fast 24-hour turnaround, certified inspector, detailed reports"
                  rows={3}
                  className="w-full bg-white/4 border border-white/8 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-primary/40 resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-white/40 mb-1.5 block flex items-center gap-1">
                    <Users className="w-3 h-3" /> Target Audience
                  </label>
                  <input
                    value={audience}
                    onChange={e => setAudience(e.target.value)}
                    placeholder="e.g. Real estate agents in South Florida"
                    className="w-full bg-white/4 border border-white/8 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-primary/40"
                  />
                </div>
                <div>
                  <label className="text-xs text-white/40 mb-1.5 block">Unique Selling Point</label>
                  <input
                    value={usp}
                    onChange={e => setUsp(e.target.value)}
                    placeholder="e.g. Fastest turnaround in the area"
                    className="w-full bg-white/4 border border-white/8 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-primary/40"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-white/40 mb-1.5 block">Main Pain Point</label>
                  <input
                    value={painPoint}
                    onChange={e => setPainPoint(e.target.value)}
                    placeholder="e.g. Slow reports delay closings"
                    className="w-full bg-white/4 border border-white/8 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-primary/40"
                  />
                </div>
                <div>
                  <label className="text-xs text-white/40 mb-1.5 block">Desired CTA</label>
                  <input
                    value={cta}
                    onChange={e => setCta(e.target.value)}
                    placeholder="e.g. Book your inspection today"
                    className="w-full bg-white/4 border border-white/8 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-primary/40"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-white/40 mb-1.5 block">Tone of Voice</label>
                <div className="flex flex-wrap gap-1.5">
                  {TONES.map(t => (
                    <button
                      key={t}
                      onClick={() => setTone(t)}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
                        tone === t
                          ? "bg-primary/15 border-primary/30 text-primary"
                          : "border-white/6 bg-white/3 text-white/35 hover:text-white/60"
                      )}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                {error}
              </div>
            )}

            {/* Generate Button */}
            <button
              onClick={handleGenerate}
              disabled={generating || !product.trim()}
              className={cn(
                "w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl text-white font-semibold text-sm transition-all",
                generating || !product.trim()
                  ? "bg-primary/30 opacity-50 cursor-not-allowed"
                  : "bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20"
              )}
            >
              {generating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Crafting {variations} expert variations…
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Generate {variations} Ad Variations
                </>
              )}
            </button>

            {/* Platform limits hint */}
            {currentPlatform && (
              <div className="flex flex-wrap gap-3 px-1">
                <span className="text-[11px] text-white/25 flex items-center gap-1">
                  <span className="font-medium text-white/40">Headline limit:</span> {currentPlatform.charLimits.headline} chars
                </span>
                <span className="text-[11px] text-white/25 flex items-center gap-1">
                  <span className="font-medium text-white/40">Body limit:</span> {currentPlatform.charLimits.body} chars
                </span>
                <span className="text-[11px] text-white/25 flex items-center gap-1">
                  <span className="font-medium text-white/40">Description limit:</span> {currentPlatform.charLimits.description} chars
                </span>
              </div>
            )}

            {/* Results */}
            <AnimatePresence>
              {results.length > 0 && (
                <motion.div
                  variants={container}
                  initial="hidden"
                  animate="show"
                  className="space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-white">
                      {results.length} Ad Variations
                      <span className="text-white/30 font-normal ml-2">· {frameworks.find(f => f.key === framework)?.name} · {currentPlatform?.name}</span>
                    </p>
                    <button
                      onClick={handleGenerate}
                      disabled={generating}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/8 text-white/40 hover:text-white text-xs font-medium transition-all"
                    >
                      <RefreshCw className={cn("w-3 h-3", generating && "animate-spin")} /> Regenerate
                    </button>
                  </div>

                  {results.map(ad => (
                    <AdCard key={ad.variation} ad={ad} platform={platform} platforms={platforms} />
                  ))}

                  {/* A/B Test tip */}
                  <div className="flex gap-3 p-4 rounded-2xl bg-white/2 border border-white/5">
                    <Lightbulb className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-semibold text-white mb-1">A/B Testing Tip</p>
                      <p className="text-[11px] text-white/40 leading-relaxed">
                        Run variations 1 and 2 first with a small budget ($5–10/day each) for 3–5 days.
                        Pause the lower CTR and scale the winner. Then test Variation 3 against the winner.
                        Always test one element at a time: hook, headline, or CTA — not all at once.
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Empty state */}
            {!generating && results.length === 0 && (
              <div className="flex flex-col items-center justify-center text-center py-16 text-white/15 space-y-3">
                <Megaphone className="w-10 h-10 opacity-20" />
                <p className="text-sm">Fill in your campaign details and generate ad copy</p>
                <p className="text-xs">Methods from Ogilvy · Halbert · Kennedy · Hopkins · Hormozi</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
