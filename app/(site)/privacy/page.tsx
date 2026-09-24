import type { Metadata } from 'next';
import { getSettings } from '@/lib/site.ts';
import { PageHero } from '../blocks.tsx';

export const metadata: Metadata = {
  title: 'Privacy notice',
  description: 'How Jukiwa Credit collects, uses and protects the information you give us through this website.',
  alternates: { canonical: '/privacy' },
};

/*
 * Written to the Data Protection Act, 2019 and to what this website actually does — which is
 * deliberately very little. Every claim here is enforced in the code: the application form cannot
 * collect an ID number because there is no field for one and no column to put it in.
 */
export default async function PrivacyPage() {
  const company = await getSettings();
  const email = company.email ?? 'info@jukiwa.co.ke';

  const sections: [title: string, body: string[]][] = [
    ['Who we are', [
      `${company.name} (“Jukiwa Credit”, “we”) is the data controller for the information you give us through this website. We are a subsidiary of ${company.parent_name ?? 'Jukiwa General Agencies Ltd'} and share its offices.`,
      `Contact us about your information at ${email}${company.postal_address ? `, or write to ${company.postal_address}, ${company.city ?? 'Nairobi'}` : ''}.`,
    ]],
    ['What we collect on this website', [
      'When you apply online: your name, phone number, email address (if you give one), where you live, the kind of finance you want, the amount and term, what would secure it and where the property is, your rent or income if you tell us, and how you would like to be contacted.',
      'When you ask a question, request a callback or enquire about partnering with us: your name, phone number, and anything you choose to write.',
      'When you subscribe to our newsletter: your email address.',
      'We deliberately do not collect your ID or passport number, KRA PIN, bank statements, title documents or any other document through this website. If you proceed, those are seen in person at one of our offices and recorded in our lending system — never on a public website.',
    ]],
    ['Why we use it', [
      'To assess your enquiry or application and contact you about it — the steps you have asked us to take before any loan agreement exists.',
      'To send you our newsletter, and — only if you ticked the box — to tell you about other Jukiwa products. You can withdraw that consent at any time.',
      'To keep a record of what was asked and answered, so that we can resolve any complaint and meet our legal obligations.',
    ]],
    ['Who sees it', [
      'Authorised Jukiwa Credit staff, whose access is limited by role: a marketing officer, for example, cannot see loan applications. Every change made to your record is logged with the name of the person who made it.',
      `Where you also use ${company.parent_name ?? 'Jukiwa General Agencies'} for property management, the two companies share what is needed to provide both services — for example, the rent schedule a rent advance is based on.`,
      'We do not sell your information, and we do not share it with advertisers. Credit reference bureaus are consulted only once you apply formally at a branch, and we will tell you when we do.',
    ]],
    ['How long we keep it', [
      'Enquiries and applications that do not become a loan are deleted within 24 months. Once a loan is agreed, the record moves to our lending system and is kept for as long as the law requires.',
      'Newsletter addresses are kept until you unsubscribe.',
    ]],
    ['Your rights', [
      'Under the Data Protection Act, 2019 you may ask to see the information we hold about you, to have it corrected or deleted, to object to our using it for marketing, and to withdraw any consent you have given.',
      `Write to ${email} and we will respond within the time the Act allows. If you are not satisfied, you may complain to the Office of the Data Protection Commissioner.`,
    ]],
    ['Security', [
      'This website is served over an encrypted connection, keeps staff sign-ins in a database rather than in your browser, limits how often any form can be submitted, and holds no loan balance, repayment history or identity document. It is built so that there is as little as possible worth taking.',
    ]],
    ['Cookies', [
      'The public website sets no advertising or tracking cookies. Staff who sign in to the admin receive a single cookie that keeps them signed in.',
    ]],
  ];

  return (
    <>
      <PageHero eyebrow="Privacy" title="Privacy notice" lead="What we collect through this website, why, and what we deliberately leave out." crumbs={[{ href: '/privacy', label: 'Privacy' }]} />
      <section className="section">
        <div className="wrap wrap-narrow prose">
          {sections.map(([title, body]) => (
            <div key={title}>
              <h3>{title}</h3>
              {body.map((paragraph) => <p key={paragraph.slice(0, 40)} style={{ marginTop: '0.8em' }}>{paragraph}</p>)}
            </div>
          ))}
          <p className="tiny muted" style={{ marginTop: 40 }}>Last updated {new Date().getFullYear()}.</p>
        </div>
      </section>
    </>
  );
}
