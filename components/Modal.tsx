"use client";

import React, { useEffect } from "react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string | React.ReactNode;
  buttonText?: string;
  onButtonClick?: () => void;
  showCloseButton?: boolean;
  // For confirmation dialogs
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  isConfirmDialog?: boolean;
}

export default function Modal({
  isOpen,
  onClose,
  title,
  message,
  buttonText = "OK",
  onButtonClick,
  showCloseButton = true,
  confirmText = "Confirm",
  cancelText = "Cancel",
  onConfirm,
  onCancel,
  isConfirmDialog = false,
}: ModalProps) {
  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleButtonClick = () => {
    if (onButtonClick) {
      onButtonClick();
    } else {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 transform transition-all duration-200 scale-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-800">{title}</h2>
          {showCloseButton && (
            <button
              onClick={onClose}
              className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
              aria-label="Close"
            >
              <svg className="w-6 h-6 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Message */}
        <div className="text-slate-600 whitespace-pre-line">{message}</div>

        {/* Buttons */}
        <div className={`flex pt-2 gap-3 ${isConfirmDialog ? 'justify-end' : 'justify-end'}`}>
          {isConfirmDialog ? (
            <>
              <button
                onClick={() => {
                  if (onCancel) {
                    onCancel();
                  } else {
                    onClose();
                  }
                }}
                className="border border-b-4 border-slate-900 px-6 py-2 bg-slate-200 text-slate-700 rounded-xl font-semibold shadow-sm hover:shadow hover:bg-slate-300 transition-all"
              >
                {cancelText}
              </button>
              <button
                onClick={() => {
                  if (onConfirm) {
                    onConfirm();
                  }
                  onClose();
                }}
                className="border border-b-4 border-red-900 px-6 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl hover:scale-105 transform transition-all"
              >
                {confirmText}
              </button>
            </>
          ) : (
            <button
              onClick={handleButtonClick}
              className="border border-b-4 border-blue-900 px-6 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl hover:scale-105 transform transition-all"
            >
              {buttonText}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

