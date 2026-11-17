import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { FileUploadModal } from '../documents/FileUploadModal';

export function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-800">
      <Sidebar
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
        onUploadClick={() => setUploadModalOpen(true)}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <Header
          setMobileOpen={setMobileOpen}
          onUploadClick={() => setUploadModalOpen(true)}
        />
        
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet context={{ openUploadModal: () => setUploadModalOpen(true) }} />
        </main>
      </div>

      <FileUploadModal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        onUploadSuccess={() => {
          // Dispatch custom event or let listeners re-fetch
          window.dispatchEvent(new CustomEvent('documents-updated'));
        }}
      />
    </div>
  );
}
