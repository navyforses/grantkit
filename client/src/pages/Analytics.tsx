/**
 * Analytics Dashboard — GrantKit catalog data visualization
 */
import { useMemo } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { catalogItems } from "@/data/catalogData";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import {
  Database, MapPin, Stethoscope, DollarSign,
  Globe, Building2, BarChart3,
} from "lucide-react";

const COLORS = ["#6C3AED", "#10B981", "#F59E0B", "#EF4444", "#3B82F6", "#EC4899", "#8B5CF6", "#14B8A6", "#F97316"];

function StatCard({ icon: Icon, label, value, sub, color }: { icon: any; label: string; value: string | number; sub?: string; color: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 md:p-5">
      <div className="flex items-center gap-3 mb-2">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="w-4.5 h-4.5 text-white" />
        </div>
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  );
}

export default function Analytics() {
  const { t, tCategory } = useLanguage();
  const data = catalogItems as any[];
  const total = data.length;

  // Category distribution
  const categoryData = useMemo(() => {
    const cats: Record<string, number> = {};
    data.forEach(g => { cats[g.category] = (cats[g.category] || 0) + 1; });
    return Object.entries(cats)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({ name: tCategory(name), value, key: name }));
  }, [data, tCategory]);

  // Type distribution
  const typeData = useMemo(() => {
    const grants = data.filter(g => g.type === "grant").length;
    return [
      { name: t.catalog.typeGrant, value: grants },
      { name: t.catalog.typeResource, value: total - grants },
    ];
  }, [data, total, t]);

  // State distribution (top 10)
  const stateData = useMemo(() => {
    const states: Record<string, number> = {};
    data.forEach(g => { states[g.state || "Unknown"] = (states[g.state || "Unknown"] || 0) + 1; });
    return Object.entries(states)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, value]) => ({ name, value }));
  }, [data]);

  // Diagnosis distribution
  const diagnosisData = useMemo(() => {
    const diags: Record<string, number> = {};
    data.forEach(g => { diags[g.targetDiagnosis || "General"] = (diags[g.targetDiagnosis || "General"] || 0) + 1; });
    return Object.entries(diags)
      .sort((a, b) => b[1] - a[1])
      .filter(([k]) => k !== "General")
      .slice(0, 10)
      .map(([name, value]) => ({ name, value }));
  }, [data]);

  // Geographic scope
  const geoData = useMemo(() => {
    const geo: Record<string, number> = {};
    data.forEach(g => { geo[g.geographicScope || "Unknown"] = (geo[g.geographicScope || "Unknown"] || 0) + 1; });
    return Object.entries(geo)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({ name, value }));
  }, [data]);

  // B2 Visa
  const visaData = useMemo(() => {
    const v: Record<string, number> = {};
    data.forEach(g => { v[g.b2VisaEligible || "uncertain"] = (v[g.b2VisaEligible || "uncertain"] || 0) + 1; });
    return Object.entries(v).map(([name, value]) => ({
      name: name === "yes" ? "✅ Yes" : name === "no" ? "❌ No" : "❓ Uncertain",
      value,
    }));
  }, [data]);

  // Top organizations
  const topOrgs = useMemo(() => {
    const orgs: Record<string, number> = {};
    data.forEach(g => { orgs[g.organization] = (orgs[g.organization] || 0) + 1; });
    return Object.entries(orgs)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, value]) => ({ name: name.length > 25 ? name.slice(0, 22) + "..." : name, value }));
  }, [data]);

  const grants = data.filter(g => g.type === "grant").length;
  const resources = total - grants;
  const ncCount = data.filter(g => g.state === "NC").length;
  const medicalCount = data.filter(g => g.category === "medical_treatment").length;

  return (
    <div className="min-h-screen flex flex-col bg-secondary">
      <SEO title="Analytics" noIndex />
      <Navbar />

      <div className="container px-4 md:px-0 py-6 md:py-10 flex-1">
        <div className="flex items-center gap-3 mb-6">
          <BarChart3 className="w-7 h-7 text-primary" />
          <h1 className="text-xl md:text-2xl font-bold text-foreground">
            {(t as any).analytics?.title || "Catalog Analytics"}
          </h1>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-8">
          <StatCard icon={Database} label={(t as any).analytics?.totalEntries || "Total Entries"} value={total} sub={`${grants} grants, ${resources} resources`} color="bg-purple-500" />
          <StatCard icon={Stethoscope} label={(t as any).analytics?.medical || "Medical"} value={medicalCount} sub={`${(medicalCount/total*100).toFixed(0)}% of total`} color="bg-emerald-500" />
          <StatCard icon={MapPin} label="North Carolina" value={ncCount} sub={`${(ncCount/total*100).toFixed(0)}% local focus`} color="bg-blue-500" />
          <StatCard icon={Globe} label={(t as any).analytics?.countries || "Countries"} value="2" sub="US + International" color="bg-amber-500" />
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">

          {/* Category Distribution */}
          <div className="bg-card border border-border rounded-xl p-4 md:p-6">
            <h3 className="text-sm font-semibold text-foreground mb-4">{(t as any).analytics?.byCategory || "By Category"}</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={categoryData} layout="vertical" margin={{ left: 10, right: 20 }}>
                <XAxis type="number" />
                <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {categoryData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Type Distribution (Pie) */}
          <div className="bg-card border border-border rounded-xl p-4 md:p-6">
            <h3 className="text-sm font-semibold text-foreground mb-4">{(t as any).analytics?.grantVsResource || "Grants vs Resources"}</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={typeData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  <Cell fill="#10B981" />
                  <Cell fill="#3B82F6" />
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* State Distribution */}
          <div className="bg-card border border-border rounded-xl p-4 md:p-6">
            <h3 className="text-sm font-semibold text-foreground mb-4">{(t as any).analytics?.byState || "By State (Top 10)"}</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stateData} margin={{ left: 10, right: 20 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#6C3AED" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Diagnosis Distribution */}
          <div className="bg-card border border-border rounded-xl p-4 md:p-6">
            <h3 className="text-sm font-semibold text-foreground mb-4">{(t as any).analytics?.byDiagnosis || "By Diagnosis (excl. General)"}</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={diagnosisData} layout="vertical" margin={{ left: 10, right: 20 }}>
                <XAxis type="number" />
                <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="value" fill="#EF4444" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Geographic Scope (Pie) */}
          <div className="bg-card border border-border rounded-xl p-4 md:p-6">
            <h3 className="text-sm font-semibold text-foreground mb-4">{(t as any).analytics?.byScope || "Geographic Scope"}</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={geoData} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {geoData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Top Organizations */}
          <div className="bg-card border border-border rounded-xl p-4 md:p-6">
            <h3 className="text-sm font-semibold text-foreground mb-4">{(t as any).analytics?.topOrgs || "Top Organizations"}</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topOrgs} layout="vertical" margin={{ left: 10, right: 20 }}>
                <XAxis type="number" />
                <YAxis type="category" dataKey="name" width={160} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="value" fill="#F59E0B" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* B-2 Visa Eligibility */}
          <div className="bg-card border border-border rounded-xl p-4 md:p-6 lg:col-span-2">
            <h3 className="text-sm font-semibold text-foreground mb-4">{(t as any).analytics?.visaEligibility || "B-2 Visa Eligibility"}</h3>
            <div className="flex items-center gap-6 justify-center h-[200px]">
              {visaData.map((item, i) => (
                <div key={i} className="text-center">
                  <div className="text-3xl font-bold text-foreground">{item.value}</div>
                  <div className="text-sm text-muted-foreground mt-1">{item.name}</div>
                  <div className="text-xs text-muted-foreground">{(item.value/total*100).toFixed(1)}%</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
