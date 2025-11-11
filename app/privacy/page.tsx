export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>
        <div className="prose prose-lg dark:prose-invert max-w-none space-y-6">
          <p className="text-muted-foreground">
            Last updated: {new Date().toLocaleDateString()}
          </p>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">1. Introduction</h2>
            <p className="text-muted-foreground leading-relaxed">
              Course Studio ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our educational platform.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">2. Information We Collect</h2>
            <h3 className="text-xl font-semibold mt-6 mb-3">2.1 Personal Information</h3>
            <p className="text-muted-foreground leading-relaxed">
              We collect information that you provide directly to us, including:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Name and email address</li>
              <li>School or organization affiliation</li>
              <li>Role (teacher, student, administrator)</li>
              <li>Profile information and preferences</li>
              <li>Content you create, upload, or share on the platform</li>
            </ul>

            <h3 className="text-xl font-semibold mt-6 mb-3">2.2 Usage Information</h3>
            <p className="text-muted-foreground leading-relaxed">
              We automatically collect certain information when you use our Service:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Log data (IP address, browser type, pages visited)</li>
              <li>Device information</li>
              <li>Usage patterns and preferences</li>
              <li>Learning progress and performance data</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">3. How We Use Your Information</h2>
            <p className="text-muted-foreground leading-relaxed">
              We use the information we collect to:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Provide, maintain, and improve our Service</li>
              <li>Process your transactions and send related information</li>
              <li>Send you technical notices and support messages</li>
              <li>Personalize your learning experience</li>
              <li>Monitor and analyze usage patterns</li>
              <li>Detect, prevent, and address technical issues</li>
              <li>Comply with legal obligations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">4. Information Sharing and Disclosure</h2>
            <p className="text-muted-foreground leading-relaxed">
              We do not sell your personal information. We may share your information only in the following circumstances:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li><strong>With your consent:</strong> We may share information when you explicitly consent</li>
              <li><strong>Service providers:</strong> We may share with third-party service providers who perform services on our behalf</li>
              <li><strong>Legal requirements:</strong> We may disclose information if required by law or in response to valid requests by public authorities</li>
              <li><strong>Educational context:</strong> Teachers and administrators may see student progress and activity within their courses</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">5. Data Security</h2>
            <p className="text-muted-foreground leading-relaxed">
              We implement appropriate technical and organizational security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the Internet or electronic storage is 100% secure.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">6. Children's Privacy</h2>
            <p className="text-muted-foreground leading-relaxed">
              Our Service is designed for educational use. If you are under 13 years of age, please obtain parental consent before using our Service. We comply with applicable children's privacy laws, including COPPA and FERPA where applicable.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">7. Your Rights and Choices</h2>
            <p className="text-muted-foreground leading-relaxed">
              You have the right to:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Access and receive a copy of your personal information</li>
              <li>Rectify inaccurate or incomplete information</li>
              <li>Request deletion of your personal information</li>
              <li>Object to processing of your personal information</li>
              <li>Request restriction of processing</li>
              <li>Data portability</li>
              <li>Withdraw consent at any time</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">8. Cookies and Tracking Technologies</h2>
            <p className="text-muted-foreground leading-relaxed">
              We use cookies and similar tracking technologies to track activity on our Service and hold certain information. You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">9. Data Retention</h2>
            <p className="text-muted-foreground leading-relaxed">
              We retain your personal information for as long as necessary to provide our Service and fulfill the purposes outlined in this Privacy Policy, unless a longer retention period is required or permitted by law.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">10. International Data Transfers</h2>
            <p className="text-muted-foreground leading-relaxed">
              Your information may be transferred to and maintained on computers located outside of your state, province, country, or other governmental jurisdiction where data protection laws may differ.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">11. Changes to This Privacy Policy</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">12. Contact Us</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you have any questions about this Privacy Policy, please contact us through our support channels or at the contact information provided on our website.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

