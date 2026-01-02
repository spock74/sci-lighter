
import React from 'react';
import { Library, User as UserIcon } from 'lucide-react';
import { User } from '../types';
import { MOCK_USERS } from '../services/cloud';
import { useLanguage } from '../LanguageContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface LoginScreenProps {
  onLogin: (user: User) => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const { t } = useLanguage();

  return (
    <div className="flex items-center justify-center min-h-screen bg-muted/50 p-6">
      <Card className="w-full max-w-md shadow-2xl animate-in zoom-in duration-500">
        <CardHeader className="text-center pb-2">
           <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4 text-primary">
             <Library size={32} />
           </div>
           <CardTitle className="text-2xl font-bold">{t('app_name')}</CardTitle>
           <CardDescription>{t('sign_in_desc')}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 pt-6">
           {MOCK_USERS.map(u => (
             <Button
               key={u.id}
               variant="outline"
               className="h-auto py-4 justify-start gap-4 hover:border-primary hover:bg-primary/5 group"
               onClick={() => onLogin(u)}
             >
               <Avatar className="h-10 w-10 ring-2 ring-transparent group-hover:ring-primary transition-all">
                 <AvatarImage src={u.avatar} alt={u.name} />
                 <AvatarFallback><UserIcon /></AvatarFallback>
               </Avatar>
               <div className="text-left flex-1">
                 <div className="font-semibold text-foreground group-hover:text-primary transition-colors">{u.name}</div>
                 <div className="text-xs text-muted-foreground">{u.email}</div>
               </div>
             </Button>
           ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default LoginScreen;
