import Link from 'next/link';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';

export const metadata = {
  title: 'BootFile \u2014 Know Your AI Style',
  description: 'Take the free 2-minute quiz. Get a personalized AI instruction profile that tells your AI how to reason with you, not just how to talk.',
};

export default function LandingPage() {
  return (
    <>
      <Header />
      <main className="pt-[60px]">
        {/* Hero */}
        <section className="py-20 md:py-28">
          <div className="max-w-[960px] mx-auto px-5 text-center">
            <div className="inline-block px-4 py-1.5 rounded-full bg-[#f0fafa] text-[#0e6e6e] text-xs font-medium mb-6">
              Free 2-minute quiz
            </div>

            <h1 className="font-heading text-4xl md:text-5xl lg:text-6xl text-gray-900 leading-tight mb-5">
              Your AI doesn&apos;t know how you think.
              <br />
              <span className="text-[#0e6e6e]">Your BootFile fixes that.</span>
            </h1>

            <p className="text-lg md:text-xl text-gray-600 max-w-[600px] mx-auto mb-8 leading-relaxed">
              Take the 2-minute quiz. Get a personalized instruction profile
              that tells ChatGPT, Claude, or Gemini how to reason with
              you &mdash; not just talk at you.
            </p>

            <Link
              href="/quiz"
              className="inline-flex items-center justify-center bg-[#0e6e6e] hover:bg-[#0a5454] active:bg-[#073d3d] text-white font-medium px-8 py-4 rounded-lg min-h-[52px] text-base transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0"
            >
              Take the Quiz &mdash; Free
            </Link>

            <p className="mt-4 text-sm text-gray-400">
              8 archetypes. 2,000+ users.
            </p>
          </div>
        </section>

        {/* Why BootFile */}
        <section className="py-16 bg-white border-y border-[#edeae5]">
          <div className="max-w-[960px] mx-auto px-5">
            <h2 className="font-heading text-3xl md:text-4xl text-gray-900 text-center mb-12">
              Why BootFile?
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-[#f7f6f2] border border-[#edeae5] rounded-xl p-6">
                <div className="text-2xl mb-3">🧠</div>
                <h3 className="font-heading text-lg text-gray-900 mb-2">
                  It prescribes reasoning, not just style
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Your BootFile doesn&apos;t just say &ldquo;be concise.&rdquo; It tells
                  your AI <em>how</em> to think through problems in a way that
                  matches how you make decisions.
                </p>
              </div>
              <div className="bg-[#f7f6f2] border border-[#edeae5] rounded-xl p-6">
                <div className="text-2xl mb-3">🚨</div>
                <h3 className="font-heading text-lg text-gray-900 mb-2">
                  It includes failure detection
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Your BootFile teaches your AI when its own output has failed
                  &mdash; before you have to point it out. A self-correcting AI
                  that knows your standards.
                </p>
              </div>
              <div className="bg-[#f7f6f2] border border-[#edeae5] rounded-xl p-6">
                <div className="text-2xl mb-3">🎯</div>
                <h3 className="font-heading text-lg text-gray-900 mb-2">
                  It&apos;s specific to your domain + decision style
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Two marketers get different BootFiles. Two engineers get
                  different BootFiles. Because how you think matters more than
                  what you do.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Objection */}
        <section className="py-16">
          <div className="max-w-[640px] mx-auto px-5">
            <div className="bg-white border border-[#dcd9d5] rounded-2xl p-8 shadow-sm">
              <h3 className="font-heading text-xl text-gray-900 mb-3">
                &ldquo;Isn&apos;t this just custom instructions?&rdquo;
              </h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Custom instructions tell your AI how to <em>format</em> responses.
                Your BootFile tells it how to <em>think</em>. It&apos;s the
                difference between &ldquo;be concise&rdquo; and a complete operating
                system with reasoning frameworks, failure detection, and
                domain-specific behavioral rules. Most people can&apos;t write this
                for themselves &mdash; not because they don&apos;t know what they
                want, but because translating intuitive preferences into
                concrete AI instructions is genuinely hard.
              </p>
            </div>
          </div>
        </section>

        {/* Second CTA */}
        <section className="py-16 text-center">
          <div className="max-w-[960px] mx-auto px-5">
            <h2 className="font-heading text-2xl md:text-3xl text-gray-900 mb-4">
              Ready to meet your AI style?
            </h2>
            <p className="text-gray-600 mb-6">
              Free quiz. 2 minutes. No signup required.
            </p>
            <Link
              href="/quiz"
              className="inline-flex items-center justify-center bg-[#0e6e6e] hover:bg-[#0a5454] active:bg-[#073d3d] text-white font-medium px-8 py-4 rounded-lg min-h-[52px] text-base transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0"
            >
              Take the Quiz &mdash; Free
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
