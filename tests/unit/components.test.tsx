// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Badge, StatusBadge, LoginStatusBadge, RoleBadge } from '../../src/components/ui/Badge';
import { Alert } from '../../src/components/ui/Alert';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { Spinner } from '../../src/components/ui/Spinner';
import { Modal } from '../../src/components/ui/Modal';

describe('I. Frontend UI Component Tests', () => {
  describe('Badge Components', () => {
    it('renders Badge with children and variant styling', () => {
      render(<Badge variant="success">Active</Badge>);
      expect(screen.getByText('Active')).toBeInTheDocument();
    });

    it('renders StatusBadge correctly for active and inactive states', () => {
      const { rerender } = render(<StatusBadge status="active" />);
      expect(screen.getByText('Active')).toBeInTheDocument();

      rerender(<StatusBadge status="inactive" />);
      expect(screen.getByText('Inactive')).toBeInTheDocument();
    });

    it('renders LoginStatusBadge correctly', () => {
      render(<LoginStatusBadge status="online" />);
      expect(screen.getByText('Online')).toBeInTheDocument();
    });

    it('renders RoleBadge correctly', () => {
      render(<RoleBadge roleSlug="super_admin" roleName="Super Admin" />);
      expect(screen.getByText('Super Admin')).toBeInTheDocument();
    });
  });

  describe('Alert Component', () => {
    it('renders error alert with message and dismiss action', () => {
      const handleClose = vi.fn();
      render(
        <Alert
          type="error"
          title="Validation Error"
          message="Email already exists in system"
          onClose={handleClose}
        />
      );

      expect(screen.getByText('Validation Error')).toBeInTheDocument();
      expect(screen.getByText('Email already exists in system')).toBeInTheDocument();

      const closeButton = screen.getByLabelText('Dismiss alert');
      fireEvent.click(closeButton);
      expect(handleClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('EmptyState Component', () => {
    it('renders title, description and triggers action button', () => {
      const handleAction = vi.fn();
      render(
        <EmptyState
          title="No Records Found"
          description="Try broadening your search query."
          actionLabel="Add Item"
          onAction={handleAction}
        />
      );

      expect(screen.getByText('No Records Found')).toBeInTheDocument();
      expect(screen.getByText('Try broadening your search query.')).toBeInTheDocument();

      const btn = screen.getByText('Add Item');
      fireEvent.click(btn);
      expect(handleAction).toHaveBeenCalledTimes(1);
    });
  });

  describe('Spinner Component', () => {
    it('renders loading spinner with role and accessible status', () => {
      render(<Spinner />);
      expect(screen.getByRole('status', { name: 'Loading' })).toBeInTheDocument();
    });
  });

  describe('Modal Component', () => {
    it('renders when isOpen is true and calls onClose when backdrop or close button is clicked', () => {
      const handleClose = vi.fn();
      const { rerender } = render(
        <Modal isOpen={true} onClose={handleClose} title="Test Modal">
          <p>Modal Content Body</p>
        </Modal>
      );

      expect(screen.getByText('Test Modal')).toBeInTheDocument();
      expect(screen.getByText('Modal Content Body')).toBeInTheDocument();

      const closeBtn = screen.getByLabelText('Close dialog');
      fireEvent.click(closeBtn);
      expect(handleClose).toHaveBeenCalledTimes(1);

      rerender(
        <Modal isOpen={false} onClose={handleClose} title="Test Modal">
          <p>Modal Content Body</p>
        </Modal>
      );
      expect(screen.queryByText('Test Modal')).not.toBeInTheDocument();
    });
  });
});
