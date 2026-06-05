import React from 'react';
import { Check, X, Calendar } from 'lucide-react'; // Hämtar snygga ikoner från Lucide

function MaintenanceCard({ name, interval, deadline, dueDate, onSetStatus }) { 
  return (
    <div style={{
      backgroundColor: '#fff',
      padding: '16px',
      borderRadius: '16px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
      border: '1px solid #E5E7EB',
      marginBottom: '12px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      fontFamily: 'sans-serif'
    }}>
      {/* VÄNSTERSIDA: TEXT OCH DATUM */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '600', color: '#1f2937' }}>
          {name}
        </h4>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#6b7280', fontSize: '12px' }}>
          <Calendar size={13} />
          <span>{dueDate || interval || deadline || "Ej angivet"}</span>
        </div>
      </div>

      {/* HÖGERSIDA: DINA TVÅ NYA ACTIONS */}
      <div style={{ display: 'flex', gap: '8px' }}>
        {/* KNAPP: SKIPPA */}
        <button
          onClick={() => onSetStatus('skipped')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            backgroundColor: '#fff',
            color: '#ef4444',
            border: '1px solid #fca5a5',
            padding: '6px 12px',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          <X size={14} />
          Skippa
        </button>

        {/* KNAPP: KLART */}
        <button
          onClick={() => onSetStatus('completed')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            backgroundColor: '#10b981',
            color: '#fff',
            border: 'none',
            padding: '6px 12px',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: '600',
            cursor: 'pointer',
            boxShadow: '0 2px 4px rgba(16, 185, 129, 0.2)',
            transition: 'all 0.2s'
          }}
        >
          <Check size={14} />
          Klart
        </button>
      </div>
    </div>
  );
}

export default MaintenanceCard;