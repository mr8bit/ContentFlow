import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Setting } from '../../services/api';
import { SettingField } from './SettingField';

interface SettingsSectionProps {
  title: string;
  description?: string;
  settings: Setting[];
  onSave: (key: string, value: string) => Promise<void>;
  isLoading?: boolean;
  icon?: React.ReactNode;
  badge?: string;
}

export const SettingsSection: React.FC<SettingsSectionProps> = ({
  title,
  description,
  settings,
  onSave,
  isLoading = false,
  icon,
  badge,
}) => {
  if (settings.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          {icon}
          <span>{title}</span>
          {badge && (
            <Badge variant="secondary" className="ml-2">
              {badge}
            </Badge>
          )}
        </CardTitle>
        {description && (
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {settings.map((setting) => (
          <SettingField
            key={setting.key}
            setting={setting}
            onSave={onSave}
            isLoading={isLoading}
          />
        ))}
      </CardContent>
    </Card>
  );
};