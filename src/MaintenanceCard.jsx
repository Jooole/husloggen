import React from 'react';
import { Check } from 'lucide-react'; // <-- HÄMTAR EN SNYGG VEKTORBOCK

function MaintenanceCard({ name, deadline, isCompleted, onToggle }) { // <-- Tog bort "icon" härifrån
  return (
    <div style={{
      backgroundColor: isCompleted ? '#f3f4f6' : '#fffdf5', 
      border: isCompleted ? '1px solid #e5e7eb' : '1px solid #fef3c7',
      borderRadius: '16px',
      padding: '16px',
      marginBottom: '12px',
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
      boxShadow: isCompleted ? 'none' : '0 2px 4px rgba(0,0,0,0.02)',
      opacity: isCompleted ? 0.6 : 1, 
      transition: 'all 0.2s'
    }}>
      {/* CHECKBOX (Klickbar cirkel) */}
      <div 
        onClick={onToggle} 
        style={{
          width: '24px',
          height: '24px',
          borderRadius: '50%',
          border: isCompleted ? '2px solid #10b981' : '2px solid #9ca3af',
          backgroundColor: isCompleted ? '#10b981' : 'transparent',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          color: '#fff',
          transition: 'all 0.2s'
        }}
      >
        {/* Riktig Lucide-ikon istället för din gamla text-bock! */}
        {isCompleted && <Check size={14} strokeWidth={3} />} 
      </div>

      {/* TEXT (Ikonen är nu helt raderad härifrån, så texten flyttar automatiskt till vänster) */}
      <div style={{ flex: 1 }}>
        <div style={{ 
          fontWeight: '600', 
          fontSize: '16px',
          textDecoration: isCompleted ? 'line-through' : 'none', 
          color: isCompleted ? '#6b7280' : '#1f2937'
        }}>
          {name}
        </div>
        <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
          Deadline: {deadline}
        </div>
      </div>
    </div>
  );
}

export default MaintenanceCard;