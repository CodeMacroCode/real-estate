import mongoose, { Schema, Document, Model } from 'mongoose';
import { IUser, SafeUser } from '../types';
import './Role';

export interface IUserDocument extends Omit<IUser, '_id'>, Document {
  toSafeUser(): SafeUser;
}

const UserSchema = new Schema<IUserDocument>(
  {
    employeeId: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      uppercase: true,
      maxlength: [50, 'Employee ID cannot exceed 50 characters'],
    },
    name: {
      type: String,
      required: [true, 'Staff member name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    username: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      lowercase: true,
      maxlength: [50, 'Username cannot exceed 50 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email address is required'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    },
    passwordHash: {
      type: String,
      required: [true, 'Password hash is required'],
      select: false, // Do not return by default in queries
    },
    encryptedPassword: {
      type: String,
      select: false, // Reversible AES-256 encrypted password for SuperAdmin inspection
      default: null,
    },
    mobile: {
      type: String,
      required: [true, 'Mobile number is required'],
      trim: true,
    },
    department: {
      type: String,
      trim: true,
      default: 'General',
    },
    roleId: {
      type: Schema.Types.ObjectId,
      ref: 'Role',
      required: [true, 'Role assignment is required'],
    },
    designation: {
      type: String,
      trim: true,
      default: 'Staff',
    },
    branch: {
      type: String,
      trim: true,
      default: 'Headquarters',
    },
    profilePhoto: {
      type: String,
      default: '',
    },
    joiningDate: {
      type: Date,
      required: [true, 'Joining date is required'],
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
      required: true,
    },
    loginStatus: {
      type: String,
      enum: ['online', 'offline', 'never_logged_in'],
      default: 'never_logged_in',
      required: true,
    },
    reportingManagerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    team: {
      type: String,
      trim: true,
      default: '',
    },
    allowedSubRoles: {
      type: [String],
      default: [],
    },
    parentAdminId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    customPermissions: [
      {
        module: { type: String, required: true },
        actions: { type: [String], default: [] },
        leadVisibilityScope: { type: String, enum: ['assigned', 'team', 'company'], default: 'assigned' },
      },
    ],
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    lastLoginAt: {
      type: Date,
      default: null,
    },
    lastLogoutAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (doc, ret) {
        delete ret.passwordHash;
        delete ret.encryptedPassword;
        const roleSlug = ret.roleId?.slug || (doc.populated && doc.populated('roleId') && (doc.roleId as any)?.slug);
        if (roleSlug === 'admin' || roleSlug === 'super_admin') {
          delete ret.employeeId;
        }
        return ret;
      },
    },
  }
);

// Indexes for performance (employeeId and email unique constraints defined on field schema)
UserSchema.index({ roleId: 1 });
UserSchema.index({ status: 1 });
UserSchema.index({ department: 1 });
UserSchema.index({ branch: 1 });
UserSchema.index({ team: 1 });

UserSchema.methods.toSafeUser = function (): SafeUser {
  const obj = this.toObject();
  delete obj.passwordHash;
  delete obj.encryptedPassword;
  const roleSlug = obj.roleId?.slug || (this.populated && this.populated('roleId') && (this.roleId as any)?.slug);
  if (roleSlug === 'admin' || roleSlug === 'super_admin') {
    delete obj.employeeId;
  }
  return obj;
};

// Ensure fresh schema compilation in development so dynamic updates like username/encryptedPassword are always recognized
if (process.env.NODE_ENV !== 'production' && mongoose.models && mongoose.models.User) {
  delete mongoose.models.User;
}

export const User: Model<IUserDocument> =
  (mongoose.models.User as Model<IUserDocument>) ||
  mongoose.model<IUserDocument>('User', UserSchema);

export default User;
