import { UserType } from "@prisma/client";

export interface AuthenticatedUser {
  id: string;
  name: string;
  mail: string;
  userType: UserType;
}

export interface AuthenticatedRequest extends Request {
  params: any;
  user?: AuthenticatedUser;
}
