export const ORGANIZATION = 'organization'
export const ORGANIZATIONS = 'organizations'
export const USER = 'user'
export const USERS = 'users'
export const HOST = 'host'

export const MEETING = 'meeting'
export const MEETINGS = 'meetings'

export const MEETING_COMMENT = 'meetingComment'
export const MEETING_COMMENTS = 'meetingComments'

export const ACTIVITY = 'activity'
export const ACTIVITIES = 'activities'

export const ACTIVITY_ESCALATION = 'activityEscalation'
export const ACTIVITY_ESCALATIONS = 'activityEscalations'

export const USER_VIDEO = 'userVideo'
export const USER_VIDEOS = 'userVideos'
export const USER_ACTIVITIES = 'userActivities'

export const USER_CODE_LENGTH = 8

export const ARC_DATE_TIME_FORMAT = 'MMM DD, YYYY hh:mm A'
export const ARC_DATE_FORMAT = 'MMM DD, YYYY'

export enum ORGANIZATION_STATUS {
    ACTIVE = 'active',
    INACTIVE = 'inactive'
}
export enum USER_STATUS {
    ACTIVE = 'active',
    INACTIVE = 'inactive'
}

export enum USER_TYPE {
    TRADER = 'trader',
    COMPLIANCE_ANALYST = 'complianceAnalyst',
    COMPLIANCE_MANAGER = 'complianceManager',
    SUPER_ADMIN = 'superAdmin'
}

export const USER_TYPES = [{
    value: USER_TYPE.SUPER_ADMIN,
    title: 'Super Admin'
}, {
    value: USER_TYPE.COMPLIANCE_ANALYST,
    title: 'Compliance Analyst'
}, {
    value: USER_TYPE.COMPLIANCE_MANAGER,
    title: 'Compliance Manager'
}]

export enum MEETING_TYPE {
    INDIVIDUAL = 'individual',
    GROUP = 'group'
}

export enum MeetingSourceType {
  MicrosoftTeams = 'microsoftTeams',
  ZoomMeeting = 'zoomMeeting',
}

export enum VIDEO_PROCESSED_STATUS {
    INITIAL = 'initial',
    PROCESSING = 'processing',
    PROCESSED = 'processed',
    FAILED = 'failed'
}

export enum ESCALATION_TYPE {
    INITIAL = 'initial',
    COMPLIANCE_ANALYST_IGNORE = 'complianceAnalystIgnore',
    COMPLIANCE_ANALYST_REPORT = 'complianceAnalystReport',
    COMPLIANCE_MANAGER_IGNORE = 'complianceManagerIgnore',
    COMPLIANCE_MANAGER_REPORT = 'complianceManagerReport',
}

export enum ArcJwtTokenType {
  UserInvitationEmail = 'userInvitationEmail',
  UserResetPasswordEmail = 'userResetPasswordEmail'
}

export enum JwtTokenStatus {
  INITIAL = 'initial',
  USED = 'used',
  DELETED = 'deleted'
}

export enum InfrastructureProvider {
  AWS = 'AWS',
  Oracle = 'oracle'
}

export const InfrastructureProviderMap = {
  [`${InfrastructureProvider.AWS}`]: InfrastructureProvider.AWS,
  [`${InfrastructureProvider.Oracle}`]: InfrastructureProvider.Oracle
}

export const AVAILABLE_DEMO_IDS = ['gabor', 'example1', 'example2', 'example3', 'example4', 'example5', 'example6']