import { useCallback, useEffect, useRef, useState } from 'react';
import { restaurant, listAll } from '../../api/endpoints';
import { apiErrorMessage } from '../../utils/format';

/** Load several restaurant lists together; `reload` refreshes them after a change. */
export function useLists(names) {
  const [lists, setLists] = useState(Object.fromEntries(names.map((n) => [n, null])));
  const [error, setError] = useState('');
  const key = names.join(',');
  const latest = useRef(0);
  const reload = useCallback(() => {
    const call = ++latest.current; // only the newest load is shown, whatever order answers arrive in
    Promise.all(key.split(',').map((n) => listAll(restaurant[n])))
      .then((all) => { if (call === latest.current) { setLists(Object.fromEntries(key.split(',').map((n, i) => [n, all[i]]))); setError(''); } })
      .catch((err) => { if (call === latest.current) setError(apiErrorMessage(err, 'Could not load the restaurant set-up.')); });
  }, [key]);
  useEffect(() => { reload(); }, [reload]);
  return [lists, reload, error];
}
