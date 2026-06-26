import type { Metadata } from 'next';
import EVFinder from '../components/EVFinder';

export const metadata: Metadata = {
  title: 'EV Charging Near You — Find Public Chargers Across Australia',
  description:
    'Find public EV charging stations near you across Australia, with connector types, charging speed and indicative network pricing. Live locations from Open Charge Map.',
  alternates: { canonical: 'https://motavo.au/ev' },
  openGraph: {
    title: 'Motavo EV Charging — Find chargers across Australia',
    description: 'Public EV charging points with connector types, speeds and indicative pricing.',
    url: 'https://motavo.au/ev',
    images: ['/opengraph-image.png'],
  },
};

export default function EVPage() {
  return (
    <>
      {/* SEO content — visible to crawlers, the finder renders the live UI */}
      <div style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap' }}>
        <h1>EV Charging Stations Near You — Australia</h1>
        <p>
          Motavo helps you find public electric vehicle charging stations across
          Australia. Search by suburb or use your location to see nearby AC and DC
          fast chargers, the connector types available (CCS2, CHAdeMO, Type 2 and
          Tesla), charging speeds in kilowatts, and indicative pricing for major
          networks including Tesla Supercharger, Chargefox, Evie, NRMA, Ampol
          AmpCharge, BP Pulse and Jolt. Charger locations are sourced live from
          Open Charge Map.
        </p>
        <h2>EV charging in your city</h2>
        <ul>
          <li>EV charging stations in Sydney, NSW</li>
          <li>EV charging stations in Melbourne, VIC</li>
          <li>EV charging stations in Brisbane, QLD</li>
          <li>EV charging stations in Perth, WA</li>
          <li>EV charging stations in Adelaide, SA</li>
        </ul>
        <h2>How much does it cost to charge an EV in Australia?</h2>
        <p>
          Public charging is priced per network, not per site, and varies by
          speed. As a guide, AC charging is typically around 30 to 50 cents per
          kWh and DC fast charging around 50 to 90 cents per kWh, with some
          networks applying peak and off-peak rates and session minimums. Motavo
          shows indicative network rates; always confirm the exact price in the
          operator’s app before charging.
        </p>
      </div>
      <EVFinder />
    </>
  );
}
