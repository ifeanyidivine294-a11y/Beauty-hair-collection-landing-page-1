import React, { useState, useEffect } from 'react';
import { 
  Check, 
  Send, 
  ShieldCheck, 
  User as UserIcon, 
  Mail, 
  Phone, 
  CheckCircle2, 
  AlertCircle,
  ExternalLink,
  Crown,
  Lock,
  X,
  Sheet
} from 'lucide-react';
import { User } from 'firebase/auth';
import { BrandLogo } from './components/BrandLogo';
import { 
  initAuth, 
  googleSignIn, 
  logoutGoogle, 
  getAccessToken 
} from './lib/auth';
import { 
  findOrCreateSpreadsheet, 
  appendLeadToGoogleSheet,
  saveLeadLocally,
  markLeadSynced,
  LeadSubmission 
} from './lib/googleSheets';

export default function App() {
  // Google Auth & Spreadsheet state (Admin / Backend Only)
  const [googleUser, setGoogleUser] = useState<User | null>(null);
  const [spreadsheetInfo, setSpreadsheetInfo] = useState<{ id: string; url: string } | null>(null);
  const [isConnectingGoogle, setIsConnectingGoogle] = useState(false);
  const [googleAuthError, setGoogleAuthError] = useState<string | null>(null);

  // Hidden admin panel toggle (accessed via ?admin=true or discrete footer lock)
  const [showAdminModal, setShowAdminModal] = useState(false);

  // Registration Form State
  const [formData, setFormData] = useState<LeadSubmission>({
    fullName: '',
    email: '',
    phone: '',
    leadSource: 'Landing Page (Free Wig Buying Guide)'
  });

  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  
  // Successful submission inline confirmation
  const [confirmedLead, setConfirmedLead] = useState<{
    leadId: string;
    fullName: string;
    email: string;
    phone: string;
    spreadsheetUrl?: string;
  } | null>(null);

  // Check URL query for ?admin=true on mount & listen to Auth state
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('admin') === 'true') {
      setShowAdminModal(true);
    }

    const unsubscribe = initAuth(
      async (user, token) => {
        setGoogleUser(user);
        setGoogleAuthError(null);
        try {
          const sheet = await findOrCreateSpreadsheet(token);
          setSpreadsheetInfo(sheet);
        } catch (err: any) {
          console.warn('Google spreadsheet verification:', err);
        }
      },
      () => {
        setGoogleUser(null);
        setSpreadsheetInfo(null);
      }
    );
    return () => unsubscribe();
  }, []);

  // Connect Google Account (Owner Admin Only)
  const handleConnectGoogle = async () => {
    setIsConnectingGoogle(true);
    setGoogleAuthError(null);
    try {
      const { user, accessToken } = await googleSignIn();
      setGoogleUser(user);
      const sheet = await findOrCreateSpreadsheet(accessToken);
      setSpreadsheetInfo(sheet);
    } catch (err: any) {
      console.error('Google authorization error:', err);
      setGoogleAuthError(err.message || 'Authorization could not be completed.');
    } finally {
      setIsConnectingGoogle(false);
    }
  };

  // Disconnect Google Account
  const handleDisconnectGoogle = async () => {
    await logoutGoogle();
    setGoogleUser(null);
    setSpreadsheetInfo(null);
  };

  // Form Validation
  const validateForm = () => {
    const errors: { [key: string]: string } = {};
    if (!formData.fullName.trim()) {
      errors.fullName = 'Please enter your full name.';
    }

    if (!formData.email.trim()) {
      errors.email = 'Please enter your email address.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      errors.email = 'Please enter a valid email address.';
    }

    const cleanPhone = formData.phone.replace(/[^0-9+]/g, '');
    if (!formData.phone.trim()) {
      errors.phone = 'Please enter your phone number.';
    } else if (cleanPhone.length < 8) {
      errors.phone = 'Please enter a valid phone number (at least 8 digits).';
    }

    return errors;
  };

  // Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    // Validate inputs
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    setFormErrors({});

    // Prevent repeated submissions
    if (isSubmitting) return;

    setIsSubmitting(true);

    try {
      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const leadId = `BHC-LEAD-${dateStr}-${randomSuffix}`;

      const submissionDate = now.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });

      const submissionTime = now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });

      // Save locally first to guarantee record preservation
      saveLeadLocally({
        leadId,
        fullName: formData.fullName.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        leadSource: formData.leadSource,
        submissionDate,
        submissionTime,
        syncedToSheets: false
      });

      // If Google Sheets is authorized, append directly to spreadsheet
      let token = await getAccessToken();
      let sheetUrl: string | undefined = undefined;

      if (token && spreadsheetInfo?.id) {
        try {
          const appendRes = await appendLeadToGoogleSheet(token, spreadsheetInfo.id, formData);
          if (appendRes.success) {
            markLeadSynced(leadId);
            sheetUrl = spreadsheetInfo.url;
          }
        } catch (sheetErr) {
          console.error('Failed to append to Google Sheets:', sheetErr);
        }
      }

      // Display successful inline confirmation
      setConfirmedLead({
        leadId,
        fullName: formData.fullName.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        spreadsheetUrl: sheetUrl
      });
    } catch (err: any) {
      console.error('Lead submission failure:', err);
      setSubmitError(
        err.message || 'We could not save your submission. Please check your network and try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7E7EC] text-[#392632] font-sans antialiased selection:bg-[#B90D55] selection:text-white flex flex-col justify-between relative overflow-x-hidden">
      
      {/* Background Ambience: Soft Rose Glows */}
      <div className="absolute top-0 left-0 w-80 h-80 bg-gradient-to-br from-[#EAC6D1]/40 to-transparent rounded-full blur-3xl pointer-events-none -translate-x-12 -translate-y-12"></div>
      <div className="absolute bottom-10 right-0 w-96 h-96 bg-gradient-to-tl from-[#EAC6D1]/30 to-transparent rounded-full blur-3xl pointer-events-none translate-x-12"></div>

      {/* Main Single Page Frame */}
      <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-8 pb-10 relative z-10">
        
        {/* ======================================================== */}
        {/* SECTION 1: MINIMAL BRAND HEADER                          */}
        {/* ======================================================== */}
        <header className="mb-4 sm:mb-8">
          <BrandLogo />
        </header>

        {/* ======================================================== */}
        {/* SECTION 2 & 3 & 4 & 5: HERO, PROMOTION, BENEFITS, FORM   */}
        {/* ======================================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-start">
          
          {/* LEFT COLUMN: Editorial Headline, Subtitle, 7 Mistakes Card, 3 Benefits */}
          <div className="lg:col-span-6 space-y-4 sm:space-y-5">
            
            {/* SECTION 2: Hero Headline & Supporting Text (Visible on first screen) */}
            <div className="space-y-2.5 sm:space-y-3.5">
              <h1 className="font-serif text-2xl sm:text-3xl lg:text-[40px] font-extrabold text-[#392632] leading-tight sm:leading-[1.16] tracking-tight">
                Tired of Wasting Money on Wigs{' '}
                <span className="italic text-[#B90D55] font-serif block sm:inline">
                  That Don’t Last?
                </span>
              </h1>

              <p className="text-xs sm:text-sm lg:text-base text-[#392632]/85 leading-relaxed font-normal max-w-xl">
                Buying the perfect wig shouldn't be confusing. Discover what to look out for before spending your money, so you can choose a wig that gives you lasting beauty and value.
              </p>
            </div>

            {/* Decorative Champagne Gold Divider */}
            <div className="flex items-center gap-2 py-0.5">
              <div className="h-[1px] w-12 bg-gradient-to-r from-transparent to-[#D6B477]"></div>
              <div className="w-2 h-2 rotate-45 bg-[#D6B477]"></div>
              <div className="h-[1px] w-24 bg-[#D6B477]"></div>
            </div>

            {/* Mobile & Tablet Hero Photo: Complete uncropped photograph with natural height */}
            <div className="block lg:hidden pt-2 pb-2">
              <div className="relative rounded-3xl overflow-hidden shadow-lg border-2 border-[#FFF9F6] bg-[#FFF9F6] max-w-xs sm:max-w-sm mx-auto">
                <img
                  src="/assets/model_wavy_portrait.png"
                  alt="Beauty Hair Collection - Black woman wearing a luxurious wavy black lace-front wig"
                  className="w-full h-auto object-contain block mx-auto"
                />
              </div>
            </div>

            {/* SECTION 3: Free Wig-Buying Guide Promotional Card */}
            <div className="plum-card-bg rounded-2xl sm:rounded-3xl p-4 sm:p-5 text-white shadow-lg border border-[#D6B477]/40 relative overflow-hidden">
              <div className="flex items-center gap-3.5 sm:gap-5">
                {/* Large Elegant Gold "7" Numeral */}
                <div className="shrink-0 w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-gradient-to-b from-[#ECC480] via-[#D6B477] to-[#B89254] text-[#392632] font-serif font-black text-2xl sm:text-4xl flex items-center justify-center shadow-md border border-[#FFF9F6]/40">
                  7
                </div>

                {/* Promotional Title */}
                <div>
                  <h2 className="font-serif text-base sm:text-xl font-bold tracking-tight text-white leading-snug">
                    Mistakes to Avoid
                  </h2>
                  <h2 className="font-serif text-base sm:text-xl font-bold tracking-tight text-white leading-snug">
                    When Buying a Wig
                  </h2>
                </div>
              </div>
            </div>

            {/* SECTION 4: Three Educational Benefits with Gold Checkmark Icons */}
            <div className="space-y-2.5 sm:space-y-3 pt-1">
              
              {/* Benefit 1 */}
              <div className="flex items-start gap-3">
                <div className="shrink-0 mt-0.5 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-gradient-to-br from-[#ECC480] to-[#D6B477] text-white flex items-center justify-center shadow-xs">
                  <Check className="w-3 h-3 sm:w-3.5 sm:h-3.5 stroke-[3] text-white" />
                </div>
                <p className="text-xs sm:text-sm text-[#392632] leading-snug font-medium">
                  Learn how to identify poor-quality wigs before purchasing.
                </p>
              </div>

              {/* Benefit 2 */}
              <div className="flex items-start gap-3">
                <div className="shrink-0 mt-0.5 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-gradient-to-br from-[#ECC480] to-[#D6B477] text-white flex items-center justify-center shadow-xs">
                  <Check className="w-3.5 h-3.5 stroke-[3] text-white" />
                </div>
                <p className="text-xs sm:text-sm text-[#392632] leading-snug font-medium">
                  Understand the difference between wig textures, hair types and quality.
                </p>
              </div>

              {/* Benefit 3 */}
              <div className="flex items-start gap-3">
                <div className="shrink-0 mt-0.5 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-gradient-to-br from-[#ECC480] to-[#D6B477] text-white flex items-center justify-center shadow-xs">
                  <Check className="w-3.5 h-3.5 stroke-[3] text-white" />
                </div>
                <p className="text-xs sm:text-sm text-[#392632] leading-snug font-medium">
                  Discover how to avoid common buying mistakes that waste your money.
                </p>
              </div>

            </div>

            {/* Editorial Photography Feature: Sleek Hair Model Accent (Desktop only) */}
            <div className="pt-2 hidden lg:block">
              <div className="relative rounded-2xl overflow-hidden shadow-md border border-[#D6B477]/40 max-w-md bg-white">
                <img
                  src="/assets/model_straight_portrait.png"
                  alt="Beauty Hair Collection - Sleek Bone Straight Raw Lace Wig"
                  className="w-full h-auto object-contain block"
                />
                <div className="absolute bottom-2 left-3 px-2.5 py-0.5 rounded-full bg-[#392632]/85 backdrop-blur-xs text-[10px] uppercase tracking-wider text-[#ECC480] font-bold">
                  100% Raw Single-Donor Human Hair
                </div>
              </div>
            </div>

          </div>

          {/* RIGHT COLUMN: Luxury Editorial Photography (Desktop) + Warm Ivory Registration Form */}
          <div className="lg:col-span-6 space-y-5 sm:space-y-6">
            
            {/* Desktop Hero Photograph: Complete uncropped photograph with natural height */}
            <div className="hidden lg:block relative rounded-3xl overflow-hidden shadow-xl border-4 border-[#FFF9F6] bg-[#FFF9F6] max-w-sm mx-auto">
              <img
                src="/assets/model_wavy_portrait.png"
                alt="Beauty Hair Collection - Smiling Black woman wearing a luxurious wavy black lace-front wig"
                className="w-full h-auto object-contain block mx-auto"
              />
            </div>

            {/* SECTION 5: Warm Ivory Registration Form Card */}
            <div className="bg-[#FFF9F6] rounded-3xl p-5 sm:p-7 luxury-card-shadow border border-[#D6B477]/50 relative max-w-md mx-auto lg:max-w-none">
              
              {/* Form Heading & Gold Crown Accent */}
              <div className="text-center space-y-1">
                <h3 className="font-serif text-lg sm:text-2xl font-black text-[#392632] tracking-tight">
                  Get Your <span className="text-[#B90D55] font-black underline decoration-[#B90D55]/30">FREE</span> Wig Buying Guide
                </h3>
                
                {/* Gold Crown Accent Divider */}
                <div className="flex items-center justify-center gap-2 py-0.5">
                  <div className="h-[1px] w-7 bg-[#D6B477]"></div>
                  <Crown className="w-3.5 h-3.5 text-[#D6B477]" />
                  <div className="h-[1px] w-7 bg-[#D6B477]"></div>
                </div>

                {/* Supporting Text */}
                <p className="text-[11px] sm:text-xs font-medium text-[#392632]/80">
                  Enter your details below and receive your free guide.
                </p>
              </div>

              {/* Inline Confirmation Experience (Section 11) */}
              {confirmedLead ? (
                <div className="mt-6 bg-[#FAF7F7] border border-[#D6B477]/60 rounded-2xl p-5 sm:p-6 text-center space-y-3.5 animate-in fade-in zoom-in-95 duration-200">
                  <div className="w-12 h-12 mx-auto rounded-full bg-[#E8F5E9] text-[#2E7D32] flex items-center justify-center shadow-inner">
                    <CheckCircle2 className="w-7 h-7 stroke-[2.5]" />
                  </div>

                  <div className="space-y-1">
                    <h4 className="font-serif text-lg sm:text-xl font-bold text-[#392632]">
                      You're In! Your Details Have Been Received.
                    </h4>
                    <p className="text-xs text-[#392632]/80 leading-relaxed">
                      Thank you for joining Beauty Hair Collection. We're excited to help you make smarter wig-buying decisions.
                    </p>
                  </div>

                  <div className="bg-white rounded-xl p-3.5 border border-[#EAC6D1]/60 text-xs text-[#392632] space-y-1 text-left">
                    <div className="flex justify-between">
                      <span className="text-stone-500">Full Name:</span>
                      <span className="font-semibold">{confirmedLead.fullName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stone-500">Email:</span>
                      <span className="font-semibold">{confirmedLead.email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stone-500">Phone:</span>
                      <span className="font-semibold">{confirmedLead.phone}</span>
                    </div>
                    <div className="flex justify-between pt-1 border-t border-[#F7E7EC]">
                      <span className="text-stone-500">Lead ID:</span>
                      <span className="font-mono text-[#B90D55] font-bold">{confirmedLead.leadId}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setConfirmedLead(null);
                      setFormData({ fullName: '', email: '', phone: '', leadSource: 'Landing Page' });
                    }}
                    className="text-xs font-semibold text-[#B90D55] hover:underline cursor-pointer"
                  >
                    Register Another Guest
                  </button>
                </div>
              ) : (
                /* Actual Working Registration Form */
                <form onSubmit={handleSubmit} className="mt-5 space-y-4">
                  
                  {/* Error banner */}
                  {submitError && (
                    <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                      <p>{submitError}</p>
                    </div>
                  )}

                  {/* Field 1: Full Name */}
                  <div>
                    <label className="sr-only" htmlFor="fullName">Full Name</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#392632]/60">
                        <UserIcon className="w-4 h-4" />
                      </div>
                      <input
                        id="fullName"
                        type="text"
                        placeholder="Full Name"
                        value={formData.fullName}
                        onChange={(e) => {
                          setFormData({ ...formData, fullName: e.target.value });
                          if (formErrors.fullName) setFormErrors({ ...formErrors, fullName: '' });
                        }}
                        className={`w-full pl-10 pr-4 py-3 rounded-2xl border text-xs sm:text-sm text-[#392632] placeholder-[#A0989D] bg-white focus:outline-none focus:ring-2 focus:ring-[#B90D55] transition-all ${
                          formErrors.fullName ? 'border-red-400 ring-1 ring-red-300' : 'border-[#EAC6D1]'
                        }`}
                      />
                    </div>
                    {formErrors.fullName && (
                      <p className="text-[11px] text-red-600 mt-1 pl-2 font-medium">{formErrors.fullName}</p>
                    )}
                  </div>

                  {/* Field 2: Email Address */}
                  <div>
                    <label className="sr-only" htmlFor="emailAddress">Email Address</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#392632]/60">
                        <Mail className="w-4 h-4" />
                      </div>
                      <input
                        id="emailAddress"
                        type="email"
                        placeholder="Email Address"
                        value={formData.email}
                        onChange={(e) => {
                          setFormData({ ...formData, email: e.target.value });
                          if (formErrors.email) setFormErrors({ ...formErrors, email: '' });
                        }}
                        className={`w-full pl-10 pr-4 py-3 rounded-2xl border text-xs sm:text-sm text-[#392632] placeholder-[#A0989D] bg-white focus:outline-none focus:ring-2 focus:ring-[#B90D55] transition-all ${
                          formErrors.email ? 'border-red-400 ring-1 ring-red-300' : 'border-[#EAC6D1]'
                        }`}
                      />
                    </div>
                    {formErrors.email && (
                      <p className="text-[11px] text-red-600 mt-1 pl-2 font-medium">{formErrors.email}</p>
                    )}
                  </div>

                  {/* Field 3: Phone Number */}
                  <div>
                    <label className="sr-only" htmlFor="phoneNumber">Phone Number</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#392632]/60">
                        <Phone className="w-4 h-4" />
                      </div>
                      <input
                        id="phoneNumber"
                        type="tel"
                        placeholder="Phone Number"
                        value={formData.phone}
                        onChange={(e) => {
                          setFormData({ ...formData, phone: e.target.value });
                          if (formErrors.phone) setFormErrors({ ...formErrors, phone: '' });
                        }}
                        className={`w-full pl-10 pr-4 py-3 rounded-2xl border text-xs sm:text-sm text-[#392632] placeholder-[#A0989D] bg-white focus:outline-none focus:ring-2 focus:ring-[#B90D55] transition-all ${
                          formErrors.phone ? 'border-red-400 ring-1 ring-red-300' : 'border-[#EAC6D1]'
                        }`}
                      />
                    </div>
                    {formErrors.phone && (
                      <p className="text-[11px] text-red-600 mt-1 pl-2 font-medium">{formErrors.phone}</p>
                    )}
                  </div>

                  {/* Primary Button: "Send Me the Free Guide" */}
                  <div className="pt-1">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="rich-berry-button w-full py-3.5 px-6 rounded-full font-serif text-sm sm:text-base font-bold text-white shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2.5 active:scale-[0.99] disabled:opacity-80 cursor-pointer"
                    >
                      {isSubmitting ? (
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span className="text-xs">Processing...</span>
                        </div>
                      ) : (
                        <>
                          <Send className="w-4 h-4 fill-white text-white" />
                          <span>Send Me the Free Guide</span>
                        </>
                      )}
                    </button>
                  </div>

                </form>
              )}

            </div>

            {/* SECTION 6: Privacy Reassurance Statement */}
            <div className="flex items-center justify-center gap-2.5 text-center px-4">
              <div className="w-6 h-6 rounded-md bg-gradient-to-b from-[#ECC480] to-[#D6B477] text-[#392632] flex items-center justify-center shadow-xs shrink-0">
                <ShieldCheck className="w-4 h-4 text-[#392632]" />
              </div>
              <p className="text-xs text-[#392632]/85 font-medium">
                Your information is safe with us. No spam. Just helpful beauty tips.
              </p>
            </div>

          </div>

        </div>

      </div>

      {/* ======================================================== */}
      {/* SECTION 7: ELEGANT FOOTER                                */}
      {/* ======================================================== */}
      <footer className="w-full plum-card-bg text-white relative overflow-hidden border-t-2 border-[#D6B477] mt-12">
        {/* Champagne gold trim line */}
        <div className="h-1 w-full bg-gradient-to-r from-[#D6B477] via-[#ECC480] to-[#D6B477]"></div>

        <div className="max-w-4xl mx-auto px-4 py-8 text-center space-y-2 relative z-10">
          {/* Brand Signature */}
          <h2 className="font-script text-3xl sm:text-4xl text-[#ECC480] tracking-wide">
            Beauty Hair Collection
          </h2>

          {/* Slogan */}
          <div className="flex items-center justify-center gap-3 pt-1">
            <div className="h-[1px] w-8 bg-[#D6B477]/60"></div>
            <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.25em] text-[#FFF9F6]/90">
              Look Good. Feel Beautiful.
            </p>
            <div className="h-[1px] w-8 bg-[#D6B477]/60"></div>
          </div>

          <div className="flex items-center justify-center gap-2 text-[10px] text-stone-400 pt-2">
            <span>Asaba, Delta State, Nigeria</span>
            <span>·</span>
            <button
              onClick={() => setShowAdminModal(true)}
              className="text-stone-400 hover:text-[#D6B477] transition-colors flex items-center gap-1 cursor-pointer"
              title="Private Owner Settings"
            >
              <Lock className="w-2.5 h-2.5" />
              <span>Admin</span>
            </button>
          </div>
        </div>
      </footer>

      {/* ======================================================== */}
      {/* PRIVATE ADMIN MODAL (NON-PUBLIC / BACKEND CONFIGURATION) */}
      {/* ======================================================== */}
      {showAdminModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#2A1A24] text-white rounded-3xl max-w-md w-full p-6 border border-[#D6B477]/50 shadow-2xl relative space-y-4">
            
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#0F9D58] flex items-center justify-center text-white">
                  <Sheet className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-serif font-bold text-sm text-white">
                    Google Sheets Lead Destination
                  </h4>
                  <p className="text-[10px] text-stone-400">
                    Private Owner Integration Settings
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowAdminModal(false)}
                className="text-stone-400 hover:text-white p-1 rounded-full cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-stone-300 space-y-2">
              <p>
                Authorizing your Google account links the spreadsheet named:
                <strong className="block text-[#D6B477] mt-0.5">
                  BEAUTY HAIR COLLECTION — CUSTOMER LEADS
                </strong>
              </p>
              <p className="text-[11px] text-stone-400">
                Columns: Lead ID, Full Name, Email Address, Phone Number, Submission Date, Submission Time, Lead Source, Submission Status.
              </p>
            </div>

            {googleAuthError && (
              <div className="p-2.5 rounded-xl bg-red-950/70 border border-red-800 text-red-300 text-xs flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{googleAuthError}</span>
              </div>
            )}

            <div className="pt-2">
              {googleUser && spreadsheetInfo ? (
                <div className="space-y-3 bg-white/5 p-3.5 rounded-xl border border-white/10">
                  <div className="flex items-center gap-1.5 text-[#34A853] font-bold text-xs">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Connected to Google Sheets</span>
                  </div>
                  <p className="text-xs text-stone-300 truncate">
                    Authorized account: {googleUser.email}
                  </p>
                  <a
                    href={spreadsheetInfo.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-[#D6B477] hover:underline font-semibold"
                  >
                    <span>Open Spreadsheet in Google Sheets</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  <div className="pt-1">
                    <button
                      onClick={handleDisconnectGoogle}
                      className="text-xs text-stone-400 hover:text-white underline cursor-pointer"
                    >
                      Disconnect Google Account
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={handleConnectGoogle}
                  disabled={isConnectingGoogle}
                  className="w-full py-3 px-4 rounded-xl text-xs font-semibold text-[#392632] bg-white hover:bg-stone-50 shadow-md flex items-center justify-center gap-2.5 transition-all cursor-pointer disabled:opacity-75"
                >
                  {isConnectingGoogle ? (
                    <div className="w-4 h-4 border-2 border-[#392632] border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <svg className="w-4 h-4" viewBox="0 0 48 48">
                      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                    </svg>
                  )}
                  <span>Authorize Google Account via Official Permission Screen</span>
                </button>
              )}
            </div>

            <p className="text-[10px] text-stone-500 text-center pt-1">
              This panel is private to the store owner and is never shown to public customers.
            </p>

          </div>
        </div>
      )}

    </div>
  );
}
