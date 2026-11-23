import TelemetryBadge from "./TelemetryBadge.jsx";

/**
 * Footer, on the section gray band.
 *
 * Apple's footer is the most overlooked part of their design system and one
 * of the most distinctive: 12 pixel gray type on light gray, a footnote block
 * above a hairline, then a multi column sitemap, then a bottom row with the
 * copyright on one side and legal links on the other.
 *
 * The footnote apparatus is real here rather than decorative. The numbered
 * notes carry the caveats that would otherwise clutter the sections above,
 * which is exactly the job Apple gives them.
 */
export default function SiteFooter({ meta, nav, telemetry, onNavigate }) {
  const year = new Date().getFullYear();

  const columns = [
    {
      heading: "This page",
      links: nav.map((item) => ({ label: item.label, id: item.id })),
    },
    {
      heading: "Elsewhere",
      links: [
        { label: "GitHub", href: meta.links.github },
        { label: "LinkedIn", href: meta.links.linkedin },
        { label: "Email", href: `mailto:${meta.links.email}` },
        { label: "Resume PDF", href: meta.resumePath },
      ],
    },
    {
      heading: "Built with",
      links: [
        { label: "React and Vite", href: "https://vite.dev" },
        { label: "Tailwind CSS", href: "https://tailwindcss.com" },
        { label: "Terraform", href: "https://developer.hashicorp.com/terraform" },
        { label: "AWS Lambda", href: "https://aws.amazon.com/lambda/" },
      ],
    },
  ];

  return (
    <footer className="band band--gray px-5 py-12 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <ol className="band-faint flex flex-col gap-2 text-[12px] leading-relaxed">
          <li id="note-1" className="scroll-mt-24">
            1. This site is a React single page application served from a
            private S3 bucket through CloudFront with Origin Access Control.
            The bucket has no public access and no website endpoint.
          </li>
          <li id="note-2" className="scroll-mt-24">
            2. The visit counter is a Python 3.11 Lambda behind an API Gateway
            HTTP API, incrementing a DynamoDB item atomically. A count of zero
            means the API has not been reached, not that the page has no
            visitors.
          </li>
          <li id="note-3" className="scroll-mt-24">
            3. The infrastructure was provisioned by Terraform and is deployed
            by GitHub Actions using OpenID Connect. The domain registration
            and the account sign in were set up by hand. No long lived AWS
            credentials are stored anywhere in the pipeline.
          </li>
        </ol>

        <div className="band-rule mt-10 grid gap-8 border-t pt-10 sm:grid-cols-3">
          {columns.map((column) => (
            <div key={column.heading}>
              <p className="band-ink mb-3 text-[12px] font-semibold">
                {column.heading}
              </p>
              <ul className="flex flex-col gap-2">
                {column.links.map((link) => (
                  <li key={link.label}>
                    {link.id ? (
                      <button
                        type="button"
                        onClick={() => onNavigate(link.id)}
                        className="band-muted text-[12px] transition-colors hover:text-link"
                      >
                        {link.label}
                      </button>
                    ) : (
                      <a
                        href={link.href}
                        target={
                          link.href.startsWith("http") ? "_blank" : undefined
                        }
                        rel={
                          link.href.startsWith("http")
                            ? "noreferrer noopener"
                            : undefined
                        }
                        className="band-muted text-[12px] transition-colors hover:text-link"
                      >
                        {link.label}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="band-rule mt-10 flex flex-col gap-4 border-t pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="band-faint text-[12px]">
            Copyright {year} {meta.name}. All rights reserved.
          </p>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
            <span className="band-faint text-[12px]">{meta.location}</span>
            <span className="band-faint hidden text-[12px] sm:inline">·</span>
            <span className="band-faint text-[12px]">{meta.availability}</span>
            <TelemetryBadge telemetry={telemetry} compact />
          </div>
        </div>
      </div>
    </footer>
  );
}
