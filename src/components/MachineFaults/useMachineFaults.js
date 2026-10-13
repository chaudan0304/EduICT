import { useCallback, useEffect, useRef, useState } from 'react';
import apiClient from '../../services/apiClient';
import { saveGlobalBrokenMachines } from '../../utils/storage';

export default function useMachineFaults() {
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const sequence = useRef(0);
  const apply = useCallback(next => {
    setMachines(next);
    saveGlobalBrokenMachines(next.filter(machine => machine.fault?.status === 'unavailable').map(machine => machine.machineNumber));
  }, []);
  const reload = useCallback(async () => {
    const requestId = ++sequence.current;
    setLoading(true);
    setError('');
    try {
      const data = await apiClient.get('/api/machines/faults');
      if (requestId === sequence.current) apply(data.machines);
    } catch (err) {
      if (requestId === sequence.current) setError(err.message);
    } finally {
      if (requestId === sequence.current) setLoading(false);
    }
  }, [apply]);
  useEffect(() => {
    reload();
    const invalidateRequests = () => { sequence.current++; };
    return invalidateRequests;
  }, [reload]);
  const save = async (number, input) => {
    const updated = await apiClient.put(`/api/machines/${number}/fault`, input);
    // Refresh every machine after a mutation; another window may have updated others.
    await reload();
    return updated;
  };
  return { machines, loading, error, reload, save };
}
