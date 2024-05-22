export interface EventStyle {
  color?: string;
  fontFamily?: string;
  fontSize?: { base: string; md: string } | string;
  border?: string;
  bg?: string;
  fontWeight?: string;
  h?: string;
  sx?: object;
  text?: string;
  image?: string;
}

export interface EventStyles {
  title: EventStyle;
  h1: EventStyle;
  h2: EventStyle;
  h3: EventStyle;
  buttons: {
    primary: EventStyle;
    secondary: EventStyle;
  };
  border: EventStyle;
  icon: EventStyle;
  background: string;
}

export interface QRPage {
  showTitle: boolean;
  showLocation: boolean;
  showDate: boolean;
  dateUnderQR: boolean;
  showDownloadButton: boolean;
  showSellTicketButton: boolean;
  sellableThroughText: boolean;
}

export interface WelcomePage {
  title: EventStyle;
}

export interface EventInfo {
  name: string;
  dateCreated: string;
  id: string;
  description: string;
  location: string;
  date: {
    startDate: number;
    endDate: number;
  };
  artwork: string;
  styles: EventStyles;
  qrPage: QRPage;
  welcomePage: WelcomePage;
  questions: any; // Replace with actual type if possible
  nearCheckout: boolean;
}
