import React from 'react';
import { redirect } from 'next/navigation';
import { getServerAuthContext } from '@/lib/auth/session';
import { connectToDatabase } from '@/lib/mongodb/db';
import { CustomForm, FormAdminAssignment } from '@/models/CustomForm';
import mongoose from 'mongoose';
import { CustomFormsClient } from './CustomFormsClient';

export const dynamic = 'force-dynamic';

export default async function CustomFormsPage() {
  const authContext = await getServerAuthContext();
  if (!authContext) {
    redirect('/login');
  }

  await connectToDatabase();
  const roleSlug = authContext.role?.slug || '';
  const isSuperAdmin = roleSlug === 'super_admin';
  const isAdmin = roleSlug === 'admin';

  let forms: any[] = [];
  let assignments: any[] = [];

  try {
    if (isSuperAdmin) {
      const rawForms = await CustomForm.find().sort({ createdAt: -1 }).lean();
      const rawAssignments = await FormAdminAssignment.find()
        .populate('adminId', 'name email designation branch')
        .populate('formId', 'name version fields')
        .sort({ createdAt: -1 })
        .lean();
      forms = JSON.parse(JSON.stringify(rawForms));
      assignments = JSON.parse(JSON.stringify(rawAssignments));
    } else if (isAdmin) {
      const rawAssignments = await FormAdminAssignment.find({
        adminId: new mongoose.Types.ObjectId(authContext.user._id),
        isActive: true,
      })
        .populate('formId')
        .lean();
      assignments = JSON.parse(JSON.stringify(rawAssignments));
    }
  } catch (err) {
    console.error('Failed to pre-fetch custom forms data on server:', err);
  }

  return (
    <CustomFormsClient
      initialForms={forms}
      initialAssignments={assignments}
    />
  );
}
