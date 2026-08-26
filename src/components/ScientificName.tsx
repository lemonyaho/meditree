import type { MicrobeDomain } from "@/lib/txt-content";

export default function ScientificName({
  name,
  domain,
  className = "",
}: {
  name: string;
  domain: MicrobeDomain;
  className?: string;
}) {
  if (domain === "virus") {
    return <span className={className}>{name}</span>;
  }

  const suffix = name.match(/\s(spp?\.?)$/i);

  if (suffix) {
    const scientificPart = name.slice(0, -suffix[0].length);

    return (
      <span className={className}>
        <i>{scientificPart}</i> {suffix[1]}
      </span>
    );
  }

  return <i className={className}>{name}</i>;
}
