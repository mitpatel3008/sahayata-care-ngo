import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Check, X } from "lucide-react";
import { toast } from "sonner";

interface Beneficiary {
  id: string;
  name: string;
  disability_type: string;
}

interface AttendanceRecord {
  beneficiary_id: string;
  present: boolean;
}

const AttendanceTracker = () => {
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [attendance, setAttendance] = useState<Record<string, boolean>>({});
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchBeneficiaries();
  }, []);

  useEffect(() => {
    fetchAttendance();
  }, [selectedDate]);

  const fetchBeneficiaries = async () => {
    const { data, error } = await supabase
      .from("beneficiaries")
      .select("id, name, disability_type")
      .order("name");

    if (error) {
      toast.error("Failed to load beneficiaries");
    } else {
      setBeneficiaries(data || []);
    }
    setLoading(false);
  };

  const fetchAttendance = async () => {
    const dateStr = selectedDate.toISOString().split('T')[0];
    const { data, error } = await supabase
      .from("attendance")
      .select("beneficiary_id, present")
      .eq("date", dateStr);

    if (error) {
      console.error("Error fetching attendance:", error);
    } else {
      const attendanceMap: Record<string, boolean> = {};
      data?.forEach((record: AttendanceRecord) => {
        attendanceMap[record.beneficiary_id] = record.present;
      });
      setAttendance(attendanceMap);
    }
  };

  const toggleAttendance = (beneficiaryId: string) => {
    setAttendance((prev) => ({
      ...prev,
      [beneficiaryId]: !prev[beneficiaryId],
    }));
  };

  const markAllPresent = () => {
    const newAttendance: Record<string, boolean> = {};
    beneficiaries.forEach((b) => {
      newAttendance[b.id] = true;
    });
    setAttendance(newAttendance);
  };

  const saveAttendance = async () => {
    setSaving(true);
    const dateStr = selectedDate.toISOString().split('T')[0];
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      toast.error("You must be logged in");
      setSaving(false);
      return;
    }

    try {
      // Delete existing attendance for this date
      await supabase
        .from("attendance")
        .delete()
        .eq("date", dateStr);

      // Insert new attendance records
      const records = Object.entries(attendance).map(([beneficiaryId, present]) => ({
        beneficiary_id: beneficiaryId,
        date: dateStr,
        present,
        marked_by: user.id,
      }));

      const { error } = await supabase
        .from("attendance")
        .insert(records);

      if (error) {
        toast.error("Failed to save attendance");
      } else {
        toast.success("Attendance saved successfully");
      }
    } catch (error) {
      toast.error("An unexpected error occurred");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center text-muted-foreground">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle>Select Date</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(date) => date && setSelectedDate(date)}
            className="rounded-md border"
          />
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>
              Attendance for {selectedDate.toLocaleDateString('en-IN', { 
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </CardTitle>
            <Button variant="outline" onClick={markAllPresent}>
              Mark All Present
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {beneficiaries.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No beneficiaries found. Add beneficiaries first.
            </div>
          ) : (
            <>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {beneficiaries.map((beneficiary) => {
                  const isPresent = attendance[beneficiary.id];
                  return (
                    <div
                      key={beneficiary.id}
                      className={`flex items-center justify-between p-4 rounded-lg border transition-colors ${
                        isPresent === true
                          ? "bg-secondary-light border-secondary"
                          : isPresent === false
                          ? "bg-destructive/10 border-destructive/30"
                          : "bg-card border-border"
                      }`}
                    >
                      <div className="flex-1">
                        <p className="font-medium">{beneficiary.name}</p>
                        <Badge variant="outline" className="mt-1 capitalize">
                          {beneficiary.disability_type}
                        </Badge>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant={isPresent === true ? "default" : "outline"}
                          className={isPresent === true ? "bg-secondary hover:bg-secondary/90" : ""}
                          onClick={() => {
                            setAttendance((prev) => ({ ...prev, [beneficiary.id]: true }));
                          }}
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant={isPresent === false ? "destructive" : "outline"}
                          onClick={() => {
                            setAttendance((prev) => ({ ...prev, [beneficiary.id]: false }));
                          }}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <Button
                onClick={saveAttendance}
                disabled={saving || Object.keys(attendance).length === 0}
                className="w-full h-12 text-base font-semibold"
              >
                {saving ? "Saving..." : "Save Attendance"}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AttendanceTracker;
