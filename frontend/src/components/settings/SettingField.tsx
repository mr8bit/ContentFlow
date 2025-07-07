import React, { useState, useEffect, useRef } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Eye, EyeOff, Edit, X, Check, Loader2 } from 'lucide-react';
import { Setting } from '../../services/api';
import {
  getSettingDescription,
  isSecretSetting,
  isBooleanSetting,
  isNumberSetting,
  isPromptSetting,
  getSettingIcon,
  formatSettingName,
} from '../../utils/settingsUtils';

interface SettingFieldProps {
  setting: Setting;
  onSave: (key: string, value: string) => Promise<void>;
  isLoading?: boolean;
}

export const SettingField: React.FC<SettingFieldProps> = ({
  setting,
  onSave,
  isLoading = false,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(setting.value || '');
  const [showSecret, setShowSecret] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isSecret = isSecretSetting(setting.key);
  const isBoolean = isBooleanSetting(setting.key);
  const isNumber = isNumberSetting(setting.key);
  const isPrompt = isPromptSetting(setting.key);
  const IconComponent = getSettingIcon(setting.key);

  // Auto-resize textarea function
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditValue(e.target.value);
    // Reset height to auto to get the correct scrollHeight
    e.target.style.height = 'auto';
    // Set height to scrollHeight to fit content
    e.target.style.height = `${Math.max(120, e.target.scrollHeight)}px`;
  };

  // Auto-resize on mount and when editing starts
  useEffect(() => {
    if (isEditing && isPrompt && textareaRef.current) {
      const textarea = textareaRef.current;
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.max(120, textarea.scrollHeight)}px`;
    }
  }, [isEditing, isPrompt]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(setting.key, editValue);
      setIsEditing(false);
    } catch (error) {
      // Error handling is done in the parent component
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditValue(setting.value || '');
    setIsEditing(false);
  };

  const handleBooleanChange = async (checked: boolean) => {
    setIsSaving(true);
    try {
      await onSave(setting.key, checked.toString());
    } catch (error) {
      // Error handling is done in the parent component
    } finally {
      setIsSaving(false);
    }
  };

  const renderValue = () => {
    if (isBoolean) {
      return (
        <div className="flex items-center space-x-2">
          <Switch
            checked={setting.value === 'true'}
            onCheckedChange={handleBooleanChange}
            disabled={isSaving || isLoading}
          />
          <Label>{setting.value === 'true' ? 'Включено' : 'Отключено'}</Label>
          {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
        </div>
      );
    }

    if (isEditing) {
      return (
        <div className="space-y-2">
          {isPrompt ? (
            <Textarea
              ref={textareaRef}
              value={editValue}
              onChange={handleTextareaChange}
              className="min-h-[120px] resize-none overflow-hidden"
              disabled={isSaving}
              placeholder="Введите промпт..."
            />
          ) : (
            <Input
              type={isSecret && !showSecret ? 'password' : isNumber ? 'number' : 'text'}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="flex-1"
              disabled={isSaving}
            />
          )}
          <div className="flex items-center space-x-2">
            {isSecret && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSecret(!showSecret)}
                disabled={isSaving}
              >
                {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleSave}
              disabled={isSaving || !editValue.trim()}
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancel}
              disabled={isSaving}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        <div className="flex items-start justify-between">
          <div className="flex-1 mr-2">
            {isPrompt && setting.value ? (
              <div className="p-3 bg-muted rounded-md text-sm text-muted-foreground whitespace-pre-wrap break-words max-h-32 overflow-y-auto">
                {setting.value}
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-muted-foreground">
                  {isSecret && setting.value
                    ? showSecret
                      ? setting.value
                      : '••••••••••••••••'
                    : setting.value || 'Не задано'}
                </span>
                {isSecret && setting.value && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowSecret(!showSecret)}
                  >
                    {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                )}
              </div>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditing(true)}
            disabled={isLoading}
          >
            <Edit className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  };

  return (
    <Card className="mb-4">
      <CardContent className="p-4">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0 mt-1">
            <IconComponent className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              <h3 className="text-sm font-medium text-foreground">
                {formatSettingName(setting.key)}
              </h3>
              {isSecret && (
                <Badge variant="secondary" className="text-xs">
                  Секретно
                </Badge>
              )}
              {isBoolean && (
                <Badge variant="outline" className="text-xs">
                  Переключатель
                </Badge>
              )}
              {isPrompt && (
                <Badge variant="outline" className="text-xs">
                  Промпт
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              {getSettingDescription(setting.key)}
            </p>
            {renderValue()}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};