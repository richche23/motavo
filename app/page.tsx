import Motavo from './components/Motavo';

export default function Page() {
  return (
    <>
      {/*
        This section is visible to search engines and screen readers even
        without JavaScript. It gives Google enough content to assess the site.
        Visually hidden — Motavo renders the real UI over the top.
      */}
      <div style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap' }}>
        <h1>Motavo — Cheapest Fuel Prices in Australia</h1>
        <p>
          Motavo shows real-time fuel prices from Australian government data feeds.
          Compare petrol, diesel, LPG and E10 prices at stations near you across
          New South Wales, Victoria, Queensland, Western Australia, South Australia,
          Tasmania, Northern Territory and the ACT. Find the cheapest unleaded,
          premium or diesel fuel in your suburb. Free, independent and updated daily
          from official state government schemes including NSW FuelCheck, Servo Saver
          Victoria, Fuel Prices Queensland and WA FuelWatch.
        </p>
        <h2>Find cheap fuel in your city</h2>
        <ul>
          <li>Cheapest petrol in Sydney, NSW</li>
          <li>Cheapest petrol in Melbourne, VIC</li>
          <li>Cheapest petrol in Brisbane, QLD</li>
          <li>Cheapest petrol in Perth, WA</li>
          <li>Cheapest petrol in Adelaide, SA</li>
          <li>Cheapest petrol in Canberra, ACT</li>
          <li>Cheapest petrol in Hobart, TAS</li>
          <li>Cheapest petrol in Darwin, NT</li>
        </ul>
        <h2>How Australian fuel price cycles work</h2>
        <p>
          Fuel prices in Australian cities follow a regular weekly or fortnightly
          cycle driven by wholesale market movements and retail competition.
          In Sydney and Brisbane, prices typically bottom out every 4 to 6 weeks
          before rising sharply and gradually falling again. In Perth, the cycle
          runs weekly with prices cheapest on Tuesdays. Knowing where you are in
          the cycle can save Australian drivers up to $20 per tank each year.
        </p>
      </div>
      <Motavo />
    </>
  );
}
