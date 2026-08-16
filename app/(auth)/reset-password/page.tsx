"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Lock, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { resetPasswordSchema, type ResetPasswordInput } from "@/lib/validations/auth.schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

export default function ResetPasswordPage() {
  const supabase = createClient();
  const [success, setSuccess] = useState(false);

  const form = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "", confirm_password: "" },
  });

  const onSubmit = async (values: ResetPasswordInput) => {
    // When the user clicks the reset link, Supabase establishes a session.
    // We can use updateUser to update the password of the logged-in user.
    const { error } = await supabase.auth.updateUser({
      password: values.password
    });
    
    if (error) {
      toast.error(error.message);
      return;
    }
    
    setSuccess(true);
    toast.success("Password reset successfully!");
    
    // We optionally sign them out so they have to log in with new credentials.
    await supabase.auth.signOut();
  };

  return (
    <>
      {success ? (
        <div className="text-center py-6 space-y-4">
          <div className="w-14 h-14 rounded-full bg-pclu-sky-500/20 flex items-center justify-center mx-auto">
            <CheckCircle size={28} className="text-pclu-sky-400" />
          </div>
          <h2 className="font-heading text-xl font-bold text-white">Password Updated</h2>
          <p className="text-slate-300 text-sm leading-relaxed">
            Your password has been successfully reset. You can now log in with your new password.
          </p>
          <Link href="/login">
            <Button className="bg-pclu-sky-600 hover:bg-pclu-sky-500 text-white w-full mt-2">Go to Login</Button>
          </Link>
        </div>
      ) : (
        <>
          <div className="mb-6">
            <h1 className="font-heading text-2xl font-bold text-white">Reset Password</h1>
            <p className="text-slate-400 text-sm mt-1">Enter your new password below.</p>
          </div>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <FormField control={form.control} name="password" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-slate-200 text-sm font-medium">New Password</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <Input {...field} type="password" placeholder="••••••••" className="bg-white/10 border-white/20 text-white placeholder:text-slate-400 h-11 pl-9" />
                    </div>
                  </FormControl>
                  <FormMessage className="text-red-300 text-xs" />
                </FormItem>
              )} />
              
              <FormField control={form.control} name="confirm_password" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-slate-200 text-sm font-medium">Confirm New Password</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <Input {...field} type="password" placeholder="••••••••" className="bg-white/10 border-white/20 text-white placeholder:text-slate-400 h-11 pl-9" />
                    </div>
                  </FormControl>
                  <FormMessage className="text-red-300 text-xs" />
                </FormItem>
              )} />
              
              <Button type="submit" disabled={form.formState.isSubmitting} className="w-full h-11 bg-gradient-to-r from-pclu-sky-600 to-pclu-sky-500 hover:from-pclu-sky-500 hover:to-pclu-sky-400 text-white font-semibold">
                {form.formState.isSubmitting ? <><Loader2 size={16} className="animate-spin mr-2" />Resetting...</> : "Reset Password"}
              </Button>
            </form>
          </Form>
        </>
      )}
    </>
  );
}
