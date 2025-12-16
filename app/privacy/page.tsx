export const metadata = {
  title: "Privacy Policy - TriviYay!",
  description: "Privacy policy for TriviYay! trivia game platform",
};

export default function PrivacyPage() {
  return (
    <div className="md:min-h-screen bg-gradient-to-br from-primary via-secondary to-tertiary p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8 pt-8">
          <h1 className="text-4xl font-bold text-white mb-2">Privacy Policy</h1>
          <p className="text-white/80">Last updated: {new Date().toLocaleDateString()}</p>
        </div>

        {/* Content */}
        <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12 space-y-6">
          <section>
            <p className="text-slate-600 leading-relaxed">
              At TriviYay!, we take your privacy seriously. This Privacy Policy explains how we collect, 
              use, disclose, and safeguard your information when you use our trivia game platform.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-800 mb-3">1. Information We Collect</h2>
            <h3 className="text-xl font-semibold text-slate-700 mb-2 mt-4">Information You Provide</h3>
            <ul className="list-disc list-inside text-slate-600 space-y-2 ml-4">
              <li><strong>Username:</strong> When you join a game, you provide a username that is displayed to other players in that game session.</li>
              <li><strong>Game Content:</strong> If you are a host, you may create questions, answers, and other game content.</li>
              <li><strong>Player Answers:</strong> Your answers to trivia questions are stored temporarily during game sessions.</li>
            </ul>
            <h3 className="text-xl font-semibold text-slate-700 mb-2 mt-4">Automatically Collected Information</h3>
            <ul className="list-disc list-inside text-slate-600 space-y-2 ml-4">
              <li><strong>Session Data:</strong> We store session information locally on your device to help you reconnect to games.</li>
              <li><strong>Game Participation:</strong> We track your participation in games, including scores and answer submissions.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-800 mb-3">2. How We Use Your Information</h2>
            <p className="text-slate-600 leading-relaxed mb-3">We use the information we collect to:</p>
            <ul className="list-disc list-inside text-slate-600 space-y-2 ml-4">
              <li>Enable you to participate in trivia games</li>
              <li>Display your username and scores to other players in the same game</li>
              <li>Maintain game state and ensure proper game functionality</li>
              <li>Allow you to reconnect to games you've joined</li>
              <li>Improve our service and user experience</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-800 mb-3">3. Information Sharing and Disclosure</h2>
            <p className="text-slate-600 leading-relaxed mb-3">
              We share your information only in the following circumstances:
            </p>
            <ul className="list-disc list-inside text-slate-600 space-y-2 ml-4">
              <li><strong>Within Game Sessions:</strong> Your username and scores are visible to all players in the same game session.</li>
              <li><strong>Game Hosts:</strong> Hosts can see all player answers and scores for their games.</li>
              <li><strong>Service Providers:</strong> We use third-party services (such as Supabase) to host and operate our platform. These services may have access to your data as necessary to provide their services.</li>
              <li><strong>Legal Requirements:</strong> We may disclose information if required by law or to protect our rights and safety.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-800 mb-3">4. Data Storage and Security</h2>
            <p className="text-slate-600 leading-relaxed mb-3">
              We implement appropriate technical and organizational measures to protect your information:
            </p>
            <ul className="list-disc list-inside text-slate-600 space-y-2 ml-4">
              <li>Data is stored securely using industry-standard encryption</li>
              <li>We use secure database systems to protect your information</li>
              <li>Session data stored locally on your device is encrypted</li>
              <li>We regularly review and update our security practices</li>
            </ul>
            <p className="text-slate-600 leading-relaxed mt-3">
              However, no method of transmission over the Internet or electronic storage is 100% secure. 
              While we strive to use commercially acceptable means to protect your information, we cannot 
              guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-800 mb-3">5. Local Storage and Cookies</h2>
            <p className="text-slate-600 leading-relaxed mb-3">
              We use local storage and cookies to:
            </p>
            <ul className="list-disc list-inside text-slate-600 space-y-2 ml-4">
              <li>Store your session information to allow you to reconnect to games</li>
              <li>Remember your player ID for specific games</li>
              <li>Maintain your preferences and game state</li>
            </ul>
            <p className="text-slate-600 leading-relaxed mt-3">
              You can control cookies through your browser settings. However, disabling cookies may 
              affect your ability to use certain features of our service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-800 mb-3">6. Data Retention</h2>
            <p className="text-slate-600 leading-relaxed">
              We retain your information for as long as necessary to provide our services and comply 
              with legal obligations. Game data, including player answers and scores, may be retained 
              for the duration of the game session and may be stored for a reasonable period afterward 
              for service improvement purposes.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-800 mb-3">7. Your Rights and Choices</h2>
            <p className="text-slate-600 leading-relaxed mb-3">You have the right to:</p>
            <ul className="list-disc list-inside text-slate-600 space-y-2 ml-4">
              <li>Access the information we hold about you</li>
              <li>Request correction of inaccurate information</li>
              <li>Request deletion of your information</li>
              <li>Opt out of certain data collection practices</li>
              <li>Clear your local storage and cookies at any time</li>
            </ul>
            <p className="text-slate-600 leading-relaxed mt-3">
              To exercise these rights, please contact us through the appropriate channels.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-800 mb-3">8. Children's Privacy</h2>
            <p className="text-slate-600 leading-relaxed">
              TriviYay! is not intended for children under the age of 13. We do not knowingly collect 
              personal information from children under 13. If you are a parent or guardian and believe 
              your child has provided us with personal information, please contact us so we can delete 
              such information.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-800 mb-3">9. Third-Party Links</h2>
            <p className="text-slate-600 leading-relaxed">
              Our service may contain links to third-party websites or services. We are not responsible 
              for the privacy practices of these third parties. We encourage you to read the privacy 
              policies of any third-party sites you visit.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-800 mb-3">10. Changes to This Privacy Policy</h2>
            <p className="text-slate-600 leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify you of any changes by 
              posting the new Privacy Policy on this page and updating the "Last updated" date. You are 
              advised to review this Privacy Policy periodically for any changes.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-800 mb-3">11. Contact Us</h2>
            <p className="text-slate-600 leading-relaxed">
              If you have any questions about this Privacy Policy or our privacy practices, please 
              contact us through the appropriate channels.
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

