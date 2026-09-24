import type { Metadata } from 'next';
import { getSettings } from '@/lib/site.ts';
import { PageHero } from '../blocks.tsx';

export const metadata: Metadata = {
  title: 'Website terms',
  description: 'The terms on which Jukiwa Credit provides this website, its calculators and its online application.',
  alternates: { canonical: '/terms' },
};

export default async function TermsPage() {
  const company = await getSettings();

  const sections: [title: string, body: string][] = [
    ['About these terms', `This website is provided by ${company.name}. By using it you accept these terms. They cover the website only; any loan is governed by its own offer letter and agreement.`],
    ['Figures are indicative', 'The rates, fees, repayments and limits shown on this website, including in the calculators, are indicative and for guidance only. They are not an offer of credit. Your actual rate, fees, repayment schedule and total cost depend on an assessment of your circumstances and the security offered, and are set out in writing in your offer letter before you sign anything.'],
    ['Applying online', 'Submitting an application through this website does not commit you to borrowing, and does not commit us to lending. It asks a credit officer to contact you. A loan exists only once you have accepted and signed a written offer.'],
    ['Accuracy', 'We take care to keep the information on this website accurate and current, but products and terms change. If anything here differs from your offer letter or agreement, the offer letter and agreement prevail.'],
    ['Your use of the website', 'Please do not submit information about another person without their permission, attempt to interfere with the website, or submit false information. We may refuse or remove any submission that appears automated or abusive.'],
    ['Links', `This website links to ${company.parent_name ?? 'our parent company'} and to social media. We are not responsible for the content of websites we do not operate.`],
    ['Complaints', `If you are unhappy with any part of our service, contact us at ${company.email ?? 'info@jukiwa.co.ke'} or visit our head office. We will acknowledge your complaint promptly and aim to resolve it fairly.`],
    ['Law', 'These terms are governed by the laws of Kenya.'],
  ];

  return (
    <>
      <PageHero eyebrow="Terms" title="Website terms" lead="Plain terms for using this website, its calculators and its online application." crumbs={[{ href: '/terms', label: 'Terms' }]} />
      <section className="section">
        <div className="wrap wrap-narrow prose">
          {sections.map(([title, body]) => (
            <div key={title}><h3>{title}</h3><p style={{ marginTop: '0.8em' }}>{body}</p></div>
          ))}
        </div>
      </section>
    </>
  );
}
