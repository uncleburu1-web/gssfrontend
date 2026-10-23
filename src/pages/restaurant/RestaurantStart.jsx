import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { restaurant } from '../../api/endpoints';

/**
 * A new restaurant branch's first steps, on the dashboard, until they are all done: the owner signed
 * up (or turned a branch into a restaurant) and now needs a menu, tables, a kitchen and a hub till
 * before the first order can be taken. Hidden once everything is there, or if the counts cannot load.
 */
export default function RestaurantStart() {
  const [state, setState] = useState(null);
  useEffect(() => {
    let live = true;
    const count = (api) => api.list().then(({ data }) => (data.count ?? (data.results || data).length));
    Promise.all([count(restaurant.items), count(restaurant.tables), count(restaurant.stations), restaurant.settings()])
      .then(([items, tables, stations, settings]) => { if (live) setState({ items, tables, stations, hub: Boolean(settings.data.hub_device) }); })
      .catch(() => {});
    return () => { live = false; };
  }, []);
  if (!state) return null;
  const steps = [
    ['menu', 'Add your menu', state.items ? `${state.items} item${state.items === 1 ? '' : 's'}` : null],
    ['tables', 'Add your tables', state.tables ? `${state.tables} table${state.tables === 1 ? '' : 's'}` : null],
    ['kitchen', 'Set up the kitchen (printer or screen)', state.stations ? `${state.stations} station${state.stations === 1 ? '' : 's'}` : null],
    ['hub', 'Choose the hub till', state.hub ? 'Chosen' : null],
  ];
  if (steps.every(([, , done]) => done)) return null;
  return (
    <div className="section" data-restaurant-start style={{ marginBottom: 16 }}>
      <div className="section-head"><h3>Set up your restaurant</h3></div>
      <div className="section-body">
        <p className="field-hint" style={{ fontSize: 13, marginTop: 4 }}>
          Four steps before the first order. Orders are then taken on the hub till (the Benchline app on your PC), even without internet.
        </p>
        {steps.map(([tab, label, done]) => (
          <div key={tab} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
            <span>{done ? '✓' : '○'} {label}</span>
            {done ? <span className="badge good">{done}</span> : <Link className="btn small" to={`/app/restaurant?tab=${tab}`}>Start</Link>}
          </div>
        ))}
      </div>
    </div>
  );
}
