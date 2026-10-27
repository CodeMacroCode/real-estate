import mongoose, { Schema, Document, Model } from 'mongoose';
import { IUser, SafeUser } from '../types';

export interface IUserDocument extends Omit<IUser, '_id'>, Document {
  toSafeUser(): SafeUser;
}

const UserSchema = new Schema<IUserDocument>(
  {
    employeeId: {
      type: String,
      required: [true, 'Employee ID is required'],
      unique: true,
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
    mobile: {
      type: String,
      required: [true, 'Mobile number is required'],
      trim: true,
    },
    department: {
      type: String,
      required: [true, 'Department is required'],
      trim: true,
    },
    roleId: {
      type: Schema.Types.ObjectId,
      ref: 'Role',
      required: [true, 'Role assignment is required'],
    },
    designation: {
      type: String,
      required: [true, 'Designation is required'],
      trim: true,
    },
    branch: {
      type: String,
      required: [true, 'Branch is required'],
      trim: true,
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
    lastLoginAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (doc, ret) {
        delete ret.passwordHash;
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
  return obj;
};

export const User: Model<IUserDocument> =
  mongoose.models.User || mongoose.model<IUserDocument>('User', UserSchema);

export default User;
