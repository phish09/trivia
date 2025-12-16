export const metadata = {
  title: "Terms and Conditions - TriviYay!",
  description: "Terms and conditions for using TriviYay! trivia game platform",
};

export default function TermsPage() {
  return (
    <div className="md:min-h-screen bg-gradient-to-br from-primary via-secondary to-tertiary p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8 pt-8">
          <h1 className="text-4xl font-bold text-white mb-2">Terms and Conditions</h1>
          <p className="text-white/80">Last updated: {new Date().toLocaleDateString()}</p>
        </div>

        {/* Content */}
        <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12 space-y-6">
          <section>
            <h2 className="text-2xl font-bold text-slate-800 mb-3">1. Acceptance of Terms</h2>
            <p className="text-slate-600 leading-relaxed">
              By accessing and using TriviYay!, you accept and agree to be bound by the terms and provision of this agreement. 
              If you do not agree to abide by the above, please do not use this service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-800 mb-3">2. Use License</h2>
            <p className="text-slate-600 leading-relaxed mb-3">
              Permission is granted to temporarily use TriviYay! for personal, non-commercial transitory viewing only. 
              This is the grant of a license, not a transfer of title, and under this license you may not:
            </p>
            <ul className="list-disc list-inside text-slate-600 space-y-2 ml-4">
              <li>Modify or copy the materials</li>
              <li>Use the materials for any commercial purpose or for any public display</li>
              <li>Attempt to reverse engineer any software contained in TriviYay!</li>
              <li>Remove any copyright or other proprietary notations from the materials</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-800 mb-3">3. User Conduct</h2>
            <p className="text-slate-600 leading-relaxed mb-3">
              You agree to use TriviYay! in a manner that is lawful and respectful. You agree not to:
            </p>
            <ul className="list-disc list-inside text-slate-600 space-y-2 ml-4">
              <li>Use offensive, inappropriate, or harmful language in usernames or game content</li>
              <li>Attempt to cheat, manipulate, or disrupt game sessions</li>
              <li>Share game codes or access with unauthorized users</li>
              <li>Use the service for any illegal or unauthorized purpose</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-800 mb-3">4. Game Content</h2>
            <p className="text-slate-600 leading-relaxed">
              Users are responsible for the content they create in games. TriviYay! does not endorse or assume responsibility 
              for user-generated content. Hosts are responsible for ensuring their questions and content comply with applicable 
              laws and community standards.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-800 mb-3">5. Privacy</h2>
            <p className="text-slate-600 leading-relaxed">
              Your use of TriviYay! is also governed by our Privacy Policy. Please review our Privacy Policy to understand our practices 
              regarding the collection and use of your information.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-800 mb-3">6. Disclaimer</h2>
            <p className="text-slate-600 leading-relaxed">
              The materials on TriviYay! are provided on an 'as is' basis. TriviYay! makes no warranties, expressed or implied, 
              and hereby disclaims and negates all other warranties including, without limitation, implied warranties or conditions 
              of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-800 mb-3">7. Limitations</h2>
            <p className="text-slate-600 leading-relaxed">
              In no event shall TriviYay! or its suppliers be liable for any damages (including, without limitation, damages for loss 
              of data or profit, or due to business interruption) arising out of the use or inability to use TriviYay!, even if 
              TriviYay! or a TriviYay! authorized representative has been notified orally or in writing of the possibility of such damage.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-800 mb-3">8. Revisions</h2>
            <p className="text-slate-600 leading-relaxed">
              TriviYay! may revise these terms of service at any time without notice. By using this service you are agreeing to be 
              bound by the then current version of these terms of service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-800 mb-3">9. Contact Information</h2>
            <p className="text-slate-600 leading-relaxed">
              If you have any questions about these Terms and Conditions, please contact us through the appropriate channels.
            </p>
          </section>

          {/* Back Button */}
          <div className="pt-6 border-t-2 border-slate-200">
            <a
              href="/"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-secondary to-tertiary text-white rounded-xl font-semibold shadow-lg hover:shadow-xl hover:scale-105 transform transition-all"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Home
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

