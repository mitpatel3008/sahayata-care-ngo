import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, FileSpreadsheet, Users, Calendar } from "lucide-react";
import { toast } from "sonner";

const ReportGenerator = () => {
  const [loading, setLoading] = useState<string | null>(null);

  const downloadBeneficiariesReport = async () => {
    setLoading("beneficiaries");
    try {
      const { data, error } = await supabase
        .from("beneficiaries")
        .select("*")
        .order("name");

      if (error) throw error;

      // Convert to CSV
      if (data && data.length > 0) {
        const headers = Object.keys(data[0]).join(",");
        const rows = data.map((row) =>
          Object.values(row)
            .map((value) => `"${value}"`)
            .join(",")
        );
        const csv = [headers, ...rows].join("\n");

        // Download
        const blob = new Blob([csv], { type: "text/csv" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `beneficiaries-${new Date().toISOString().split("T")[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);

        toast.success("Beneficiaries report downloaded");
      } else {
        toast.error("No data to export");
      }
    } catch (error: any) {
      toast.error("Failed to generate report");
    } finally {
      setLoading(null);
    }
  };

  const downloadAttendanceReport = async () => {
    setLoading("attendance");
    try {
      const { data, error } = await supabase
        .from("attendance")
        .select(`
          *,
          beneficiaries (
            name,
            disability_type
          )
        `)
        .order("date", { ascending: false })
        .limit(1000);

      if (error) throw error;

      if (data && data.length > 0) {
        // Flatten the data structure for CSV
        const flatData = data.map((record: any) => ({
          date: record.date,
          beneficiary_name: record.beneficiaries?.name,
          disability_type: record.beneficiaries?.disability_type,
          present: record.present ? "Yes" : "No",
          notes: record.notes || "",
        }));

        const headers = Object.keys(flatData[0]).join(",");
        const rows = flatData.map((row) =>
          Object.values(row)
            .map((value) => `"${value}"`)
            .join(",")
        );
        const csv = [headers, ...rows].join("\n");

        const blob = new Blob([csv], { type: "text/csv" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `attendance-${new Date().toISOString().split("T")[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);

        toast.success("Attendance report downloaded");
      } else {
        toast.error("No data to export");
      }
    } catch (error: any) {
      toast.error("Failed to generate report");
    } finally {
      setLoading(null);
    }
  };

  const reports = [
    {
      title: "Beneficiaries List",
      description: "Export complete list of all registered beneficiaries",
      icon: Users,
      action: downloadBeneficiariesReport,
      key: "beneficiaries",
    },
    {
      title: "Attendance Report",
      description: "Export attendance records with beneficiary details",
      icon: Calendar,
      action: downloadAttendanceReport,
      key: "attendance",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {reports.map((report) => (
        <Card key={report.key} className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
                <report.icon className="w-6 h-6 text-primary-foreground" />
              </div>
              <div className="flex-1">
                <CardTitle>{report.title}</CardTitle>
                <CardDescription className="mt-2">{report.description}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Button
              onClick={report.action}
              disabled={loading === report.key}
              className="w-full gap-2"
            >
              {loading === report.key ? (
                "Generating..."
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Download CSV
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      ))}

      <Card className="md:col-span-2 border-dashed">
        <CardContent className="py-12">
          <div className="text-center text-muted-foreground">
            <FileSpreadsheet className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p className="font-medium">More report types coming soon</p>
            <p className="text-sm mt-2">PDF reports, analytics dashboards, and custom filters</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ReportGenerator;
