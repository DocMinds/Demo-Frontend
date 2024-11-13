import { Component, Input } from '@angular/core';
import { AppointmentConfirmService } from '../../services/appointment-confirm.service';
import { app } from '../../../../server';
import { DoctorServiceService } from '../../services/doctor-details/doctor-service.service';
import { stat } from 'node:fs';
import * as XLSX from 'xlsx';
interface Appointment {
  id?: number;
  patientName: string;
  phoneNumber: string;
  doctorName: string;
  doctorId:number;
  department: string;
  date: string;
  time: string;
  status: string;
  email: string;
  smsSent?:boolean;
  emailSent?:boolean;
  requestVia?: string; // Optional property
  [key: string]: any;  // Add this line to allow indexing by string
  created_at?: string;
  isrescheduled?: boolean;
  user?:any;
}
@Component({
  selector: 'app-appointment-cancel',
  templateUrl: './appointment-cancel.component.html',
  styleUrl: './appointment-cancel.component.css'
})
export class AppointmentCancelComponent {
  cancelledAppointments: Appointment[] = [];
  constructor(private appointmentService: AppointmentConfirmService, private doctorService: DoctorServiceService) {
    this.userId = localStorage.getItem('userid')
  }
  // appointments: Appointment[] = [
  //   { id: '0001', patientName: 'Nitish MK', phoneNumber: '7708699010', doctorName: 'Dr. Nithish', department: 'Psychologist', date: '11/02/24', time: '9.00 to 9.15', status: 'Cancelled' },
  //   { id: '0002', patientName: 'Lokesh P', phoneNumber: '9876543211', doctorName: 'Dr. Nithish', department: 'Psychologist', date: '11/02/24', time: '9.00 to 9.15', status: 'Cancelled' },
  //   // Add more appointments here...
  // ];
  searchOptions = [
    { label: 'Patient Name', value: 'patientName' },
    { label: 'Phone Number', value: 'phoneNumber' }
  ];
  @Input() selectedDate: Date | null = null;
  @Input() selectedValue: string = '';
  @Input() selectedSearchOption: string = ''; 
  @Input() selectedDateRange: Date[] = [];
  filteredList: any;

  showAppointmentForm = false;  // Controls the visibility of the modal
  selectedAppointment: Appointment | null = null; 
  confirmedAppointments: Appointment[] = []; 
  activeAppointmentId: number | null | undefined = null;
  userId: any = 0;
  isLockedDialogVisible: boolean = false; // To control the visibility of the lock dialog
  isSubmitting: boolean = false;
  ngOnInit() {
    
    this.appointmentService.canceledAppointments$.subscribe(appointments => {
      this.cancelledAppointments = appointments;
      // this.cancelledAppointments = appointments;
      this.cancelledAppointments.sort((a, b) => {
        const dateA = new Date(a.created_at!);
        const dateB = new Date(b.created_at!);
        return dateB.getTime() - dateA.getTime();
      });
      this.filteredAppointments = [...this.cancelledAppointments];

    });
  }
  currentPage = 1;
  itemsPerPage = 10;
  sortColumn: keyof Appointment | undefined = undefined;  // No sorting initially
  sortDirection: string = 'asc';  // Default sorting direction
  // @Input() selectedDate: Date | null = null;
  // @Input() selectedValue: string = '';

  // Method to handle sorting by a specific column
  sortBy(column: keyof Appointment) {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc'; // Toggle direction
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc'; // Default to ascending when a new column is clicked
    }
    if (column === 'date') {
      this.filteredAppointments.sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return this.sortDirection === 'asc' ? dateA.getTime() - dateB.getTime() : dateB.getTime() - dateA.getTime();
      });
    }
    this.currentPage = 1; // Reset to the first page when sorting changes
  }

  // Method to sort appointments based on the selected column and direction
  sortedAppointments() {
    if (!this.sortColumn) {
      return [...this.filteredAppointments];  // No sorting if the column is undefined
    }

    return [...this.filteredAppointments].sort((a, b) => {
      const valueA = a[this.sortColumn!]; // Using non-null assertion (!) to handle the sort column
      const valueB = b[this.sortColumn!];

      if (typeof valueA === 'string' && typeof valueB === 'string') {
        const comparison = valueA.localeCompare(valueB);
        return this.sortDirection === 'asc' ? comparison : -comparison;
      }

      return 0; // Default to no sorting if types are not strings
    });
  }

  // Method to return paginated appointments after sorting
  getPaginatedAppointments() {
    const sorted = this.sortedAppointments();
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    return sorted.slice(startIndex, startIndex + this.itemsPerPage); // Return paginated data
  }

  // Method to calculate total pages
  get totalPages() {
    return Math.ceil(this.cancelledAppointments.length / this.itemsPerPage);
  }

  // Method to go to the previous page
  prevPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  // Method to go to the next page
  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
    }
  }

  // Handle page number change
  onPageChange() {
    if (this.currentPage < 1) {
      this.currentPage = 1;
    } else if (this.currentPage > this.totalPages) {
      this.currentPage = this.totalPages;
    }
  }

  // Method to confirm appointment (changes status)
  // confirmAppointment(appointment: Appointment) {
  //   const index = this.cancelledAppointments.findIndex(a => a.id === appointment.id);
  //   if (index !== -1) {
  //     this.cancelledAppointments[index].status = 'Confirmed'; // Change status to confirmed
  //   }
  // }
  filteredAppointments: Appointment[] = [...this.cancelledAppointments];

  ngOnChanges() {
    // Whenever the selected date changes, this will be triggered
    this.filterAppointment();
  }
  
  // Method to filter appointments by the selected date
  // filterAppointment() {
  //   let filteredList = [...this.cancelledAppointments];

  
  //   if (this.selectedDate) {
  //     const formattedDate = this.formatDate(this.selectedDate);
  //     filteredList = filteredList.filter(appointment => appointment.date === formattedDate);
  //   }
  //   if (this.selectedValue.trim() !== '') {
  //     const searchLower = this.selectedValue.toLowerCase();
  //     // filteredList = this.filteredAppointments.filter(appointment =>
  //     //   appointment.patientName.toLowerCase().includes(searchLower) ||
  //     //   appointment.phoneNumber.toLowerCase().includes(searchLower)
  //     // );
  //     filteredList = this.filteredAppointments.filter((appointment) => {
  //       console.log('Selected search option:', this.selectedSearchOption);
  //       console.log('Selected value:', this.selectedValue);
       
  //       console.log('Search lower:', searchLower);
  //       console.log('Appointment:', appointment);
  //       console.log('Filtered list:', filteredList);
      
  //       let match = false;

  //       switch (this.selectedSearchOption) {
  //         case 'patientName':
  //           console.log('Patient Name:', appointment.patientName.toLowerCase());
  //           match = appointment.patientName ? appointment.patientName.toLowerCase().includes(searchLower) : false;
  //           console.log('Match:', match);
  //           break;
  //         case 'phoneNumber':
  //           match = appointment.phoneNumber ? appointment.phoneNumber.toLowerCase().includes(searchLower) : false;
  //           break;
  //         case 'doctorName':
  //           match = appointment.doctorName ? appointment.doctorName.toLowerCase().includes(searchLower) : false;
  //           break;
  //         default:
  //           match = true;
  //       }
  

  //     return match;
  //   });
  
  //   }
  //   else {
  //     // If no date is selected, show all appointments
  //     this.filteredAppointments = [...this.cancelledAppointments];
  //   }
  //   this.filteredAppointments = filteredList;
  //   this.currentPage = 1;
  // }
  filterAppointment() {
    this.filteredList = [...this.cancelledAppointments];
  
    if (this.selectedDateRange && this.selectedDateRange.length === 2) {
      const startDate = this.selectedDateRange[0];
      const endDate = this.selectedDateRange[1] ? this.selectedDateRange[1] : startDate; // Use endDate if provided, otherwise use startDate
  
      if (startDate && endDate) {
        if(startDate.getTime() !== endDate.getTime()) {
        // Filtering appointments by the selected date range
        // console.log('Start date:', startDate, 'End date:', endDate);
        const normalizedEndDate = new Date(endDate);
    normalizedEndDate.setHours(23, 59, 59, 999);  // Set to the last millisecond of the day

        this.filteredList = this.filteredList.filter((appointment: Appointment) => {
          const appointmentDate = new Date(appointment.date);  // Assuming 'date' is in string format like 'YYYY-MM-DD'
          return appointmentDate >= startDate && appointmentDate <= normalizedEndDate;
        });
        // console.log('Filtered list:', this.filteredList);
      }
      else if (startDate.getTime() === endDate.getTime()) {
        // console.log('Single date selected:');
        const startDate = this.selectedDateRange[0];
    
        this.filteredList = this.filteredList.filter((appointment: Appointment) => {
          const appointmentDate = new Date(appointment.date);
          return appointmentDate.toDateString() === startDate.toDateString();  // Compare the date portion only
        });
        // console.log('Filtered list:', this.filteredList);
      }
    }
    else{
      this.filteredAppointments = []
    }
    }
     else {
      // If no valid range is selected, show all appointments
      this.filteredAppointments = [...this.cancelledAppointments];
    }
    if (this.selectedValue.trim() !== '') {
      const searchLower = this.selectedValue.toLowerCase();
      // filteredList = this.filteredAppointments.filter(cancelledAppointments =>
      //   completedAppointments.patientName.toLowerCase().includes(searchLower) ||
      //   completedAppointments.phoneNumber.toLowerCase().includes(searchLower)

      // );
      this.filteredList = this.filteredAppointments.filter((appointment) => {
        // console.log('Selected search option:', this.selectedSearchOption);
        // console.log('Selected value:', this.selectedValue);
       
        // console.log('Search lower:', searchLower);
        // console.log('Appointment:', appointment);
        // console.log('Filtered list:', this.filteredList);
      
        let match = false;

        switch (this.selectedSearchOption) {
          case 'patientName':
            // console.log('Patient Name:', appointment.patientName.toLowerCase());
            match = appointment.patientName ? appointment.patientName.toLowerCase().includes(searchLower) : false;
            // console.log('Match:', match);
            break;
          case 'phoneNumber':
            match = appointment.phoneNumber ? appointment.phoneNumber.toLowerCase().includes(searchLower) : false;
            break;
          case 'doctorName':
            match = appointment.doctorName ? appointment.doctorName.toLowerCase().includes(searchLower) : false;
            break;
          default:
            match = true;
        }
  

      return match;
    });
  

    }
    else {
      // If no date is selected, show all appointments
      this.filteredAppointments = [...this.cancelledAppointments];
    }
    this.filteredAppointments = this.filteredList;
    this.currentPage = 1;
  }
  downloadFilteredData(): void {
    // console.log('Downloading completed appointments data...');
    if (this.filteredList && this.filteredList.length > 0) {
      // console.log('Downloading filtered data...');

      // const selectedFields = this.filteredList.map((appointment: Appointment) => ({
      //   'Patient Name': appointment.patientName,
      //   'Patient Phone Number': appointment.phoneNumber,
      //   'Patient Email': appointment.email,
      //   'Doctor Name': appointment.doctorName,
      //   'Department': appointment.department,
      //   'Appointment Date': appointment.date,
      //   'Appointment Time': appointment.time,
      //   'Appointment Created Time': appointment.created_at,
      //   'Request Via': appointment.requestVia,
      //   'SMS Sent': appointment.smsSent ? 'Yes' : 'No',
      //   'Email Sent': appointment.emailSent ? 'Yes' : 'No',
      //   'Status': appointment.status,
      //   'Appointment Handled By': appointment.user!.username
      // }));
      const selectedFields = this.filteredList.map((appointment: Appointment) => {
        if(appointment.created_at){
        const createdAt = new Date(appointment?.created_at);
        const createdDate = createdAt.toISOString().split('T')[0]; // Extract the date part in YYYY-MM-DD format
        const createdTime = createdAt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }); // Extract time in HH:mm (24-hour format)
        
        appointment.created_at = createdDate + ' ' + createdTime;
        }
        return {
          'Patient Name': appointment.patientName,
          'Patient Phone Number': appointment.phoneNumber,
          'Patient Email': appointment.email,
          'Doctor Name': appointment.doctorName,
          'Department': appointment.department,
          'Appointment Date': appointment.date,
          'Appointment Time': appointment.time,
          'Appointment Created Time': appointment.created_at,
          'Request Via': appointment.requestVia,
          'SMS Sent': appointment.smsSent ? 'Yes' : 'No',
          'Email Sent': appointment.emailSent ? 'Yes' : 'No',
          'Status': appointment.status,
          'Appointment Handled By': appointment.user!.username,
        };
      
      });
      // Step 1: Convert the filtered data to a worksheet
      const worksheet = XLSX.utils.json_to_sheet(selectedFields);
      // Step 3: Generate the sheet name with truncation if necessary
      const startDate = this.formatDate(this.selectedDateRange[0]);
    //  console.log(this.formatDate(this.selectedDateRange[0])); 
      const endDate = this.selectedDateRange[1] ? this.formatDate(this.selectedDateRange[1]) : startDate;
    let sheetName = `Cancelled Appointments`;
    // console.log('Sheet name:', sheetName);
    
    // Truncate sheet name to 31 characters
    if (sheetName.length > 31) {
      sheetName = sheetName.substring(0, 31);  // Ensure name is 31 characters or fewer
    }
      
      // Step 2: Create a new workbook and add the worksheet
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

      // Step 3: Write the workbook to a binary string
      const excelBuffer = XLSX.write(workbook, {
        bookType: 'xlsx',
        type: 'array',
      });

      // Step 4: Create a Blob from the binary string
      const blob = new Blob([excelBuffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      // Step 5: Trigger the download
      const link = document.createElement('a');
      const url = window.URL.createObjectURL(blob);
      link.href = url;
      link.download =  `${sheetName}.xlsx`;  // Set the download attribute to the sheet name
      link.click();
      window.URL.revokeObjectURL(url);
    } else {
      console.warn('No data available to download');
    }
  }
  // Utility method to format the date in 'dd/mm/yy' format
  formatDate(date: Date): string {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-based
    const year = date.getFullYear().toString().slice(-4); // Get last two digits of year
    return `${year}-${month}-${day}`;
  }

  // Method to return the filtered appointments for display
  getFilteredAppointments() {
    return this.filteredAppointments;
  }
//   openAppointmentForm(appointment: Appointment) {

//     this.selectedAppointment = { ...appointment };  // Create a copy to avoid direct modification
//     this.showAppointmentForm = true;
//     console.log('Selected appointment:', this.selectedAppointment);
// }  
openAppointmentForm(appointment: Appointment): void {

  // this.selectedAppointment = { ...appointment };  // Create a copy to avoid direct modification
  // this.showAppointmentForm = true;
  // console.log('Selected appointment:', this.selectedAppointment);
  this.lockAndAccessAppointment(appointment);
}
lockAndAccessAppointment(appointment:Appointment): void {
  const appointmentId = appointment.id!;
  this.appointmentService.lockAppointment(appointmentId, this.userId).subscribe({
    next: (response) => {
      // Successfully locked, proceed to open the form
      this.activeAppointmentId = appointmentId;

      // Proceed to open the appointment form since the lock was successful
    this.selectedAppointment = { ...appointment };  // Create a copy to avoid direct modification
    this.showAppointmentForm = true;

    },
    error: (error) => {
      if (error.status === 409) {
        // Show lock modal if the appointment is locked by another user
        this.isLockedDialogVisible = true;
        console.warn('The appointment is currently locked by another user.');
      } else if (error.status === 401) {
        // If unauthorized, do NOT redirect automatically, show a custom message instead
        console.error('Unauthorized access - maybe the session expired.');
        alert('You are not authorized to access this resource. Please re-authenticate.');
      } else {
        console.error('Error locking the appointment:', error);
      }
    }

  });
}
handleLockedDialogClose(): void {
  // Hide the locked dialog
  this.isLockedDialogVisible = false;
}

// Cleanup: unlock appointment if component is destroyed
ngOnDestroy(): void {
  if (this.activeAppointmentId !== null) {
    this.closeAppointmentForm();
  }
}
closeAppointmentForm() {
  this.showAppointmentForm = false;
  if (this.activeAppointmentId !== null) {
    // Call backend to unlock the appointment
    this.appointmentService.unlockAppointment(this.activeAppointmentId!).subscribe({
      next: () => {

        this.activeAppointmentId = null;
        this.selectedAppointment = null; // Close the form
      },
      error: (error) => {
        console.error('Error unlocking appointment:', error);
      }
    });
  }

}
submitAppointment(appointment: Appointment | null, status: string, requestVia: any) {

  
  if (!appointment) {
      console.error('No appointment selected for submission.');
      return; // Early return if appointment is null or undefined
  }
   // Check if the form is already submitting
   if (this.isSubmitting) {
    return;
  }
  this.isSubmitting = true; // Set the flag
  // console.log(appointment,'canel')

  const confirmedAppointment: Appointment = { 
      ...appointment,  // Copy all properties from the original appointment
      smsSent: true,
      emailSent: true,
      requestVia: appointment.requestVia, // Determine requestVia
      status: 'confirmed'
  };
  // console.log('appointment',confirmedAppointment)
  // console.log('status:', status);

  // if(status === 'rescheduled'){
  //   this.appointmentService.addConfirmedAppointment(confirmedAppointment);
  //   this.doctorService.getDoctorDetails(appointment.doctorId).subscribe({
  //     next: (response) => {
  //       const doctorPhoneNumber = response?.phone_number;
  //       let phoneNumber = appointment!.phoneNumber;

  //       if (!phoneNumber.startsWith('91')) {
  //         phoneNumber = '91' + phoneNumber;
  //       }
  //       const appointmentDetails = {
  //         patientName:appointment?.patientName,
  //         doctorName:appointment?.doctorName,
  //         date:appointment?.date,
  //         time:appointment?.time,
  //         doctorPhoneNumber: doctorPhoneNumber,
  //         patientPhoneNumber: phoneNumber,
  //         status: 'rescheduled'
  //       }
  //       console.log('appointment details', appointmentDetails)
  //       this.appointmentService.sendWhatsAppMessage(appointmentDetails).subscribe({
  //         next: (response) => {
  //           console.log('WhatsApp message sent successfully:', response);
  //         },
  //         error: (error) => {
  //           console.error('Error sending WhatsApp message:', error);
  //         }
  //       });
  //     }

  //   });


  //   this.doctorService.getDoctorDetails(appointment.doctorId).subscribe({
  //     next: (response) => {
  //       const doctorEmail = response?.email;
  //       const patientEmail = appointment?.email;

  //       // Ensure both emails are valid
  //       if (!doctorEmail || !patientEmail) {
  //         console.error('Doctor or patient email is missing.');
  //         return;
  //       }

  //       // Prepare appointment details for email
  //       const appointmentDetails = {
  //         patientName: appointment?.patientName,
  //         doctorName: appointment?.doctorName,
  //         date: appointment?.date,
  //         time: appointment?.time,
  //       };

  //       const status = 'rescheduled';

  //       // Send email to the doctor
  //       this.appointmentService.sendEmail(doctorEmail, status, appointmentDetails, 'doctor').subscribe({
  //         next: (response) => {
  //           console.log('Email sent to doctor successfully:', response);
  //         },
  //         error: (error) => {
  //           console.error('Error sending email to doctor:', error);
  //         },
  //       });

  //       // Send email to the patient
  //       this.appointmentService.sendEmail(patientEmail, status, appointmentDetails, 'patient').subscribe({
  //         next: (response) => {
  //           console.log('Email sent to patient successfully:', response);
  //         },
  //         error: (error) => {
  //           console.error('Error sending email to patient:', error);
  //         },
  //       });
  //     },
  //     error: (error) => {
  //       console.error('Error in getting doctor details:', error);
  //     },
  //   });
  // }
  if (status === 'rescheduled') {
    appointment.isrescheduled = true;
    // this.doctorService.getDoctorDetails(appointment.doctorId).subscribe((response) => {
    //   const doctorPhoneNumber = response?.phone_number;
    //           const doctorEmail = response?.email;
    //     const patientEmail = appointment?.email;

    //     // Ensure both emails are valid
    //     if (!doctorEmail || !patientEmail) {
    //       console.error('Doctor or patient email is missing.');
    //       return;
    //     }
    //   const appointmentDetails = {
    //     patientName: appointment?.patientName,
    //     doctorName: appointment?.doctorName,
    //     date: appointment?.date,
    //     time: appointment?.time,
    //     doctorPhoneNumber,
    //     patientPhoneNumber: appointment?.phoneNumber,
    //     status: 'rescheduled',
    //     doctorEmail,
    //     patientEmail,


        
    //   };
    //   this.appointmentService.sendRescheduledMessage(appointmentDetails).subscribe({
    //     next: (response) => {
    //       console.log('Rescheduled message sent successfully:', response);
    //     },
    //     error: (error) => {
    //       console.error('Error sending rescheduled message:', error);
    //     }
    //   });
    // });
  }

  

  if (status === 'Confirm') {
      confirmedAppointment.status = 'confirmed'; // Set the status to confirmed
      this.appointmentService.addConfirmedAppointment(confirmedAppointment);
    // Fetch doctor's details to get the doctor's email
    // this.doctorService.getDoctorDetails(appointment.doctorId).subscribe({
    //   next: (response) => {
    //     const doctorEmail = response?.email;
    //     const patientEmail = appointment?.email;

    //     // Ensure both emails are valid
    //     if (!doctorEmail || !patientEmail) {
    //       console.error('Doctor or patient email is missing.');
    //       return;
    //     }

    //     // Prepare appointment details for email
    //     const appointmentDetails = {
    //       patientName: appointment?.patientName,
    //       doctorName: appointment?.doctorName,
    //       date: appointment?.date,
    //       time: appointment?.time,
    //     };

    //     const emailStatus = 'rescheduled';

    //     // Send email to the doctor
    //     this.appointmentService.sendEmail(doctorEmail, emailStatus, appointmentDetails, 'doctor').subscribe({
    //       next: (response) => {
    //         console.log('Email sent to doctor successfully:', response);
    //       },
    //       error: (error) => {
    //         console.error('Error sending email to doctor:', error);
    //       },
    //     });

    //     // Send email to the patient
    //     this.appointmentService.sendEmail(patientEmail, emailStatus, appointmentDetails, 'patient').subscribe({
    //       next: (response) => {
    //         console.log('Email sent to patient successfully:', response);
    //       },
    //       error: (error) => {
    //         console.error('Error sending email to patient:', error);
    //       },
    //     });
    //   },
    //   error: (error) => {
    //     console.error('Error in getting doctor details:', error);
    //   },
    // });
      
  

      // Remove the confirmed appointment from the canceled appointments
      this.cancelledAppointments = this.cancelledAppointments.filter(a => a.id !== appointment.id);
      
  } else if (status === 'Cancel') {
      confirmedAppointment.status = 'Cancelled'; // Update the status
      this.appointmentService.addCancelledAppointment(confirmedAppointment);
      this.doctorService.getDoctorDetails(appointment.doctorId).subscribe({
        next: (response) =>{
          const doctorPhoneNumber = response?.phone_number;
          const appointmentDetails ={
            patientName: appointment?.patientName,
            doctorName: appointment?.doctorName,
            date: appointment?.date,
            time: appointment?.time,
            doctorPhoneNumber: doctorPhoneNumber,
            patientPhoneNumber: appointment?.phoneNumber,
            status: 'cancelled'
          }
          this.appointmentService.sendWhatsAppMessage(appointmentDetails).subscribe({
            next: (response) => {
              console.log('WhatsApp message sent successfully:', response);
            },
            error: (error) => {
              console.error('Error sending WhatsApp message:', error);
            }
          });
        }
        
      });
      const appointmentDetails = {
        patientName: appointment?.patientName,
        doctorName: appointment?.doctorName,
        date: appointment?.date,
        time: appointment?.time,
      };
      const patientEmail = appointment.email;

      const emailStatus = 'cancelled';
      this.appointmentService.sendEmail(patientEmail, emailStatus, appointmentDetails, 'patient').subscribe({
        next: (response) => {
          console.log('Email sent to patient successfully:', response);
        },
        error: (error) => {
          console.error('Error sending email to patient:', error);
        },
      });
  }

  // Additional filtering and updates
  this.closeAppointmentForm();
  this.filterAppointment(); // Refresh the filtered appointments
}

}
