"use client";

import { useState } from "react";

const currentFeatures = [
  {
    icon: "🏠",
    name: "Property Management",
    description:
      "Add and manage all your units in one place — building name, area, type, bedrooms, rent, and status (occupied/vacant).",
  },
  {
    icon: "👤",
    name: "Tenant Profiles",
    description:
      "Store full tenant details including nationality, passport and Emirates ID expiry dates, phone, and notes.",
  },
  {
    icon: "📄",
    name: "Document Storage",
    description:
      "Upload and store tenant documents (passports, Emirates IDs, visas) linked directly to each tenant profile.",
  },
  {
    icon: "📋",
    name: "Ejari & Compliance Tracking",
    description:
      "Track Ejari contract numbers and expiry dates per unit. Color-coded badges show what's expired, expiring soon, or valid.",
  },
  {
    icon: "📅",
    name: "Compliance Calendar",
    description:
      "A monthly calendar view showing all upcoming Ejari renewals, passport expiries, and Emirates ID renewals across your entire portfolio.",
  },
  {
    icon: "🔍",
    name: "Condition Reports (Inspections)",
    description:
      "Create move-in and move-out inspection reports room by room, with photo uploads and PDF export.",
  },
  {
    icon: "🔧",
    name: "Maintenance Tracker",
    description:
      "Log maintenance issues per unit, set priority and category, assign to a contractor, track cost, and mark as resolved.",
  },
  {
    icon: "💰",
    name: "Rent & Payment Tracker",
    description:
      "Log rent payments per tenant and unit. Track what's collected, what's outstanding, and what's overdue.",
  },
  {
    icon: "🗄️",
    name: "Property Vault",
    description:
      "Store property-level documents like title deeds, NOCs, and insurance certificates — with expiry tracking per document.",
  },
  {
    icon: "🛠️",
    name: "Services Directory",
    description:
      "A curated list of Dubai service providers (plumbers, electricians, legal, etc.) with real pricing information.",
  },
  {
    icon: "📊",
    name: "Reports & PDF Export",
    description:
      "Export your portfolio data and inspection reports as clean PDFs.",
  },
];

const plannedFeatures = [
  "Email & WhatsApp alerts for Ejari renewals, rent due dates, and expiring documents",
  "Tenant portal — tenants can submit maintenance requests and view their own documents",
  "Multi-user access — add your property managers or agents with role-based permissions",
  "DLD / RERA integration for automated compliance checks",
  "Automated Ejari renewal reminders and workflow",
  "Financial dashboard — income, expenses, ROI per property",
  "Lease agreement builder and e-signature",
  "Owner reporting — send periodic summaries to property owners",
  "Mobile app",
];

export default function FeedbackPage() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    units: "",
    usefulFeatures: [] as string[],
    plannedFeatures: [] as string[],
    biggestPain: "",
    missing: "",
    wouldUse: "",
    other: "",
  });

  const handleCheckbox = (
    field: "usefulFeatures" | "plannedFeatures",
    value: string
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: prev[field].includes(value)
        ? prev[field].filter((v) => v !== value)
        : [...prev[field], value],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const payload = {
      name: formData.name,
      units: formData.units,
      usefulFeatures: formData.usefulFeatures.join(", "),
      plannedFeatures: formData.plannedFeatures.join(", "),
      biggestPain: formData.biggestPain,
      missing: formData.missing,
      wouldUse: formData.wouldUse,
      other: formData.other,
    };

    try {
      const res = await fetch("https://formspree.io/f/mojbqpyb", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setSubmitted(true);
      } else {
        alert("Something went wrong. Please try again.");
      }
    } catch {
      alert("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px 14px",
    border: "1px solid #D1D5DB",
    borderRadius: "8px",
    fontSize: "15px",
    color: "#1a1a1a",
    background: "#fff",
    outline: "none",
    boxSizing: "border-box",
    fontFamily: "inherit",
  };

  const textareaStyle: React.CSSProperties = {
    ...inputStyle,
    minHeight: "100px",
    resize: "vertical",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontWeight: 600,
    fontSize: "15px",
    color: "#1a1a1a",
    marginBottom: "8px",
  };

  const sectionStyle: React.CSSProperties = {
    marginBottom: "32px",
  };

  if (submitted) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#F9FAFB",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "Inter, system-ui, sans-serif",
          padding: "24px",
        }}
      >
        <div
          style={{
            background: "#fff",
            borderRadius: "16px",
            padding: "56px 48px",
            maxWidth: "480px",
            width: "100%",
            textAlign: "center",
            boxShadow: "0 4px 24px rgba(0,0,0,0.07)",
          }}
        >
          <div style={{ fontSize: "48px", marginBottom: "20px" }}>✅</div>
          <h2
            style={{ fontSize: "24px", fontWeight: 700, color: "#1a1a1a", marginBottom: "12px" }}
          >
            Thank you for your feedback
          </h2>
          <p style={{ color: "#6B7280", fontSize: "16px", lineHeight: 1.6 }}>
            Your input is genuinely valuable and will shape the direction of this product.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#F9FAFB",
        fontFamily: "Inter, system-ui, sans-serif",
        color: "#1a1a1a",
        padding: "48px 24px",
      }}
    >
      <div style={{ maxWidth: "720px", margin: "0 auto" }}>

        {/* Header */}
        <div style={{ marginBottom: "48px" }}>
          <div
            style={{
              display: "inline-block",
              background: "#EFF6FF",
              color: "#1D4ED8",
              fontSize: "13px",
              fontWeight: 600,
              padding: "5px 12px",
              borderRadius: "20px",
              marginBottom: "16px",
              letterSpacing: "0.3px",
            }}
          >
            Early Access — Feedback Request
          </div>
          <h1
            style={{
              fontSize: "32px",
              fontWeight: 800,
              color: "#0F172A",
              marginBottom: "16px",
              lineHeight: 1.25,
            }}
          >
            Help shape COMPLY.AE
          </h1>
          <p
            style={{
              fontSize: "16px",
              color: "#4B5563",
              lineHeight: 1.75,
              maxWidth: "620px",
            }}
          >
            COMPLY.AE is a property operations platform built specifically for landlords
            and property managers in Dubai. It brings everything — tenants, documents,
            Ejari compliance, maintenance, and rent tracking — into one organised place,
            instead of scattered across WhatsApp, Excel, and email.
          </p>
          <p
            style={{
              fontSize: "16px",
              color: "#4B5563",
              lineHeight: 1.75,
              marginTop: "12px",
              maxWidth: "620px",
            }}
          >
            Your experience managing property in the UAE makes your feedback more valuable
            than anyone else&apos;s. This form takes around 5 minutes and your answers will
            directly influence what gets built next.
          </p>
        </div>

        {/* Current Features */}
        <div
          style={{
            background: "#fff",
            borderRadius: "16px",
            padding: "32px",
            marginBottom: "24px",
            boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
          }}
        >
          <h2
            style={{
              fontSize: "20px",
              fontWeight: 700,
              color: "#0F172A",
              marginBottom: "6px",
            }}
          >
            What&apos;s built right now
          </h2>
          <p style={{ color: "#6B7280", fontSize: "14px", marginBottom: "24px" }}>
            These features are live and working today.
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: "16px",
            }}
          >
            {currentFeatures.map((f) => (
              <div
                key={f.name}
                style={{
                  background: "#F8FAFC",
                  border: "1px solid #E2E8F0",
                  borderRadius: "10px",
                  padding: "16px",
                }}
              >
                <div style={{ fontSize: "22px", marginBottom: "8px" }}>{f.icon}</div>
                <div
                  style={{ fontWeight: 600, fontSize: "14px", color: "#0F172A", marginBottom: "5px" }}
                >
                  {f.name}
                </div>
                <div style={{ fontSize: "13px", color: "#6B7280", lineHeight: 1.5 }}>
                  {f.description}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Planned Features */}
        <div
          style={{
            background: "#fff",
            borderRadius: "16px",
            padding: "32px",
            marginBottom: "40px",
            boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
          }}
        >
          <h2
            style={{
              fontSize: "20px",
              fontWeight: 700,
              color: "#0F172A",
              marginBottom: "6px",
            }}
          >
            What&apos;s coming next
          </h2>
          <p style={{ color: "#6B7280", fontSize: "14px", marginBottom: "20px" }}>
            These are features we plan to build. Your feedback will help us prioritise.
          </p>
          <ul style={{ padding: 0, margin: 0, listStyle: "none" }}>
            {plannedFeatures.map((f) => (
              <li
                key={f}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "10px",
                  padding: "10px 0",
                  borderBottom: "1px solid #F1F5F9",
                  fontSize: "14px",
                  color: "#374151",
                  lineHeight: 1.5,
                }}
              >
                <span style={{ color: "#93C5FD", marginTop: "2px", flexShrink: 0 }}>◆</span>
                {f}
              </li>
            ))}
          </ul>
        </div>

        {/* Feedback Form */}
        <div
          style={{
            background: "#fff",
            borderRadius: "16px",
            padding: "32px",
            boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
          }}
        >
          <h2
            style={{
              fontSize: "20px",
              fontWeight: 700,
              color: "#0F172A",
              marginBottom: "6px",
            }}
          >
            Your feedback
          </h2>
          <p style={{ color: "#6B7280", fontSize: "14px", marginBottom: "28px" }}>
            Be as honest as you want. There are no wrong answers.
          </p>

          <form onSubmit={handleSubmit}>

            {/* Name */}
            <div style={sectionStyle}>
              <label style={labelStyle}>Your name</label>
              <input
                style={inputStyle}
                type="text"
                placeholder="e.g. Ahmed Al Mansoori"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            {/* Units */}
            <div style={sectionStyle}>
              <label style={labelStyle}>
                How many residential units do you currently manage?
              </label>
              <input
                style={inputStyle}
                type="text"
                placeholder="e.g. 12 units across 3 buildings"
                value={formData.units}
                onChange={(e) => setFormData({ ...formData, units: e.target.value })}
              />
            </div>

            {/* Useful current features */}
            <div style={sectionStyle}>
              <label style={labelStyle}>
                Which of the current features would actually be useful to you?
              </label>
              <p style={{ color: "#9CA3AF", fontSize: "13px", marginBottom: "12px" }}>
                Select all that apply.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {currentFeatures.map((f) => (
                  <label
                    key={f.name}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      cursor: "pointer",
                      fontSize: "14px",
                      color: "#374151",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={formData.usefulFeatures.includes(f.name)}
                      onChange={() => handleCheckbox("usefulFeatures", f.name)}
                      style={{ width: "16px", height: "16px", accentColor: "#1D4ED8", flexShrink: 0 }}
                    />
                    {f.name}
                  </label>
                ))}
              </div>
            </div>

            {/* Biggest pain */}
            <div style={sectionStyle}>
              <label style={labelStyle}>
                What is the biggest frustration in how you currently manage your portfolio?
              </label>
              <p style={{ color: "#9CA3AF", fontSize: "13px", marginBottom: "12px" }}>
                Think about your day-to-day — what wastes your time, causes mistakes, or falls through the cracks?
              </p>
              <textarea
                style={textareaStyle}
                placeholder="e.g. I keep missing Ejari renewal deadlines because everything is in different spreadsheets..."
                value={formData.biggestPain}
                onChange={(e) => setFormData({ ...formData, biggestPain: e.target.value })}
              />
            </div>

            {/* What's missing */}
            <div style={sectionStyle}>
              <label style={labelStyle}>
                Looking at what&apos;s been built — what&apos;s missing that would make this genuinely useful?
              </label>
              <textarea
                style={textareaStyle}
                placeholder="e.g. I'd need integration with DLD, or a way to track cheque bounces..."
                value={formData.missing}
                onChange={(e) => setFormData({ ...formData, missing: e.target.value })}
              />
            </div>

            {/* Planned features priority */}
            <div style={sectionStyle}>
              <label style={labelStyle}>
                From the planned features list above, which ones matter most to you?
              </label>
              <p style={{ color: "#9CA3AF", fontSize: "13px", marginBottom: "12px" }}>
                Select all that apply.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {plannedFeatures.map((f) => (
                  <label
                    key={f}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "10px",
                      cursor: "pointer",
                      fontSize: "14px",
                      color: "#374151",
                      lineHeight: 1.5,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={formData.plannedFeatures.includes(f)}
                      onChange={() => handleCheckbox("plannedFeatures", f)}
                      style={{ width: "16px", height: "16px", accentColor: "#1D4ED8", flexShrink: 0, marginTop: "2px" }}
                    />
                    {f}
                  </label>
                ))}
              </div>
            </div>

            {/* Would you use it */}
            <div style={sectionStyle}>
              <label style={labelStyle}>
                Would you use a tool like this? If yes — what would it need to have for you to switch to it?
              </label>
              <textarea
                style={textareaStyle}
                placeholder="Be direct. What would make you actually pay for and use this?"
                value={formData.wouldUse}
                onChange={(e) => setFormData({ ...formData, wouldUse: e.target.value })}
              />
            </div>

            {/* Other */}
            <div style={sectionStyle}>
              <label style={labelStyle}>Anything else you want to add?</label>
              <textarea
                style={{ ...textareaStyle, minHeight: "80px" }}
                placeholder="Anything at all..."
                value={formData.other}
                onChange={(e) => setFormData({ ...formData, other: e.target.value })}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                padding: "14px",
                background: loading ? "#93C5FD" : "#1D4ED8",
                color: "#fff",
                border: "none",
                borderRadius: "10px",
                fontSize: "16px",
                fontWeight: 700,
                cursor: loading ? "not-allowed" : "pointer",
                transition: "background 0.2s",
                fontFamily: "inherit",
              }}
            >
              {loading ? "Sending..." : "Submit Feedback"}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p
          style={{
            textAlign: "center",
            color: "#9CA3AF",
            fontSize: "13px",
            marginTop: "32px",
          }}
        >
          COMPLY.AE — Dubai Property Operations Platform
        </p>
      </div>
    </div>
  );
}
