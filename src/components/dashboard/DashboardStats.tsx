import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Calendar, FileText, TrendingUp } from "lucide-react";

const DashboardStats = () => {
  const [stats, setStats] = useState({
    totalBeneficiaries: 0,
    todayAttendance: 0,
    totalDocuments: 0,
    activeToday: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      const today = new Date().toISOString().split('T')[0];

      const [beneficiaries, attendance, documents] = await Promise.all([
        supabase.from('beneficiaries').select('*', { count: 'exact', head: true }),
        supabase.from('attendance').select('*', { count: 'exact', head: true }).eq('date', today),
        supabase.from('documents').select('*', { count: 'exact', head: true }),
      ]);

      const attendanceCount = await supabase
        .from('attendance')
        .select('*', { count: 'exact', head: true })
        .eq('date', today)
        .eq('present', true);

      setStats({
        totalBeneficiaries: beneficiaries.count || 0,
        todayAttendance: attendance.count || 0,
        totalDocuments: documents.count || 0,
        activeToday: attendanceCount.count || 0,
      });
    };

    fetchStats();
  }, []);

  const statCards = [
    {
      title: "Total Beneficiaries",
      value: stats.totalBeneficiaries,
      icon: Users,
      color: "bg-primary",
    },
    {
      title: "Present Today",
      value: stats.activeToday,
      icon: TrendingUp,
      color: "bg-secondary",
    },
    {
      title: "Attendance Records",
      value: stats.todayAttendance,
      icon: Calendar,
      color: "bg-accent",
    },
    {
      title: "Total Documents",
      value: stats.totalDocuments,
      icon: FileText,
      color: "bg-muted-foreground",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {statCards.map((stat, index) => (
        <Card key={index} className="hover:shadow-lg transition-shadow animate-fade-in" style={{ animationDelay: `${index * 0.1}s` }}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {stat.title}
            </CardTitle>
            <div className={`w-10 h-10 ${stat.color} rounded-lg flex items-center justify-center`}>
              <stat.icon className="w-5 h-5 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stat.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default DashboardStats;
