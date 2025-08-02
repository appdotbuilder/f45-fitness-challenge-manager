
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { RefreshCwIcon, FilterIcon } from 'lucide-react';
// Using type-only imports
import type { User, AuditLog as AuditLogType } from '../../../server/src/schema';

interface AuditLogProps {
  auditLogs: AuditLogType[];
  users: User[];
}

export function AuditLog({ auditLogs, users }: AuditLogProps) {
  const getUserName = (userId: number) => {
    const user = users.find((u: User) => u.id === userId);
    return user ? `${user.first_name} ${user.last_name}` : 'Unknown User';
  };

  const getActionBadgeVariant = (action: string) => {
    switch (action) {
      case 'create':
        return 'default';
      case 'update':
        return 'secondary';
      case 'delete':
        return 'destructive';
      case 'login':
        return 'outline';
      case 'impersonate':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'create':
        return '➕';
      case 'update':
        return '✏️';
      case 'delete':
        return '🗑️';
      case 'login':
        return '🔐';
      case 'impersonate':
        return '👤';
      case 'assign':
        return '📌';
      case 'deactivate':
        return '⏸️';
      default:
        return '📝';
    }
  };

  const getResourceTypeLabel = (resourceType: string) => {
    switch (resourceType) {
      case 'competition':
        return 'Competition';
      case 'competition_entry':
        return 'Entry';
      case 'user':
        return 'User';
      default:
        return resourceType;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Audit Log</h3>
          <p className="text-sm text-gray-600">Track all system activities and changes</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <FilterIcon className="h-4 w-4 mr-2" />
            Filter
          </Button>
          <Button variant="outline" size="sm">
            <RefreshCwIcon className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>System Activity ({auditLogs.length} entries)</CardTitle>
          <CardDescription>
            Comprehensive log of all user actions and system changes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px]">
            <div className="space-y-4">
              {auditLogs.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>No audit log entries found.</p>
                </div>
              ) : (
                auditLogs
                  .sort((a: AuditLogType, b: AuditLogType) => 
                    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                  )
                  .map((log: AuditLogType) => (
                    <div key={log.id} className="flex items-start justify-between p-4 border rounded-lg bg-gray-50">
                      <div className="flex items-start space-x-3">
                        <div className="text-lg">
                          {getActionIcon(log.action)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-medium text-sm">
                              {getUserName(log.user_id)}
                            </p>
                            <Badge variant={getActionBadgeVariant(log.action)} className="text-xs capitalize">
                              {log.action}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {getResourceTypeLabel(log.resource_type)}
                            </Badge>
                          </div>
                          
                          {log.details && (
                            <p className="text-sm text-gray-600 mb-2">{log.details}</p>
                          )}
                          
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span>📅 {log.created_at.toLocaleString()}</span>
                            {log.ip_address && (
                              <span>🌐 {log.ip_address}</span>
                            )}
                            {log.resource_id && (
                              <span>🔗 ID: {log.resource_id}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
