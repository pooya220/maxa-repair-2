import { Repair, SystemSettings } from "../types";

export interface SmsPayload {
  smsType: 'receipt' | 'inspection' | 'cost' | 'cost_approved' | 'replacement' | 'shipping';
  title: string;
  stepName: string;
  bodyId: string;
  phone: string;
  recipientName: string;
  variables: string[];
  previewMessage: string;
  dbField: keyof Repair;
}

/**
 * Calculates delivery estimation text based on the repair company, exactly as in the C# application:
 * - مکسا: *یک هفته آینده*
 * - تایگر / سپید / بامداد / سایر: *دو هفته آینده*
 * - پالیز: *سه الی چهار هفته آینده*
 */
export function getDeliveryEstimateByCompany(company?: string): string {
  const comp = (company || "").trim();
  if (comp === "مکسا") {
    return "*یک هفته آینده*";
  }
  if (
    comp === "تایگر" ||
    comp === "سپید" ||
    comp === "سپید سیستم" ||
    comp === "بامداد" ||
    comp === "بامداد صنعت" ||
    comp === "سایر"
  ) {
    return "*دو هفته آینده*";
  }
  if (comp === "پالیز") {
    return "*سه الی چهار هفته آینده*";
  }
  return "*یک هفته آینده*";
}

/**
 * Prepares the complete SMS payload according to Payamak-Panel SendByBaseNumber patterns and variables:
 * - receipt: bodyId 384713, 7 variables {0}..{6}
 * - inspection: bodyId 384735, 5 variables {0}..{4}
 * - cost: bodyId 384746, 4 variables {0}..{3}
 * - cost_approved: bodyId 384747, 4 variables {0}..{3}
 * - replacement: bodyId 400795, 4 variables {0}..{3}
 * - shipping: bodyId 384757, 4 variables {0}..{3}
 */
export function prepareSmsPayload(
  smsType: 'receipt' | 'inspection' | 'cost' | 'cost_approved' | 'replacement' | 'shipping',
  repair: Partial<Repair>,
  settings?: SystemSettings
): SmsPayload {
  const phone = (repair.contactNumber || "").replace(/\s+/g, "").trim();
  const customer = (repair.customerName || "").trim();
  const person = (repair.contactPerson || "").trim();
  const model = (repair.deviceModel || "").trim();
  const serial = (repair.serialNumber || "").trim();
  const problem = (repair.problem || "").trim();
  const accessories = (repair.accessories || "").trim();
  const receiveDate = (repair.receiveDate || "").trim();
  const repairCompany = (repair.repairCompany || "مکسا").trim();

  let title = "";
  let stepName = "";
  let bodyId = "";
  let variables: string[] = [];
  let previewMessage = "";
  let dbField: keyof Repair = 'smsSentReceipt';

  switch (smsType) {
    case 'receipt':
      title = "ارسال پیامک دریافت دستگاه";
      stepName = "مرحله ۱: دریافت دستگاه";
      bodyId = settings?.smsBodyIdReceipt || "384713";
      dbField = 'smsSentReceipt';
      variables = [customer, person, model, serial, problem, accessories, receiveDate];
      previewMessage = `شرکت ${customer} آقا/خانم ${person} دستگاه ${model} به شماره سریال ${serial} با مشکل اعلام شده ${problem} و متعلقات تحویل داده شده ${accessories} در تاریخ ${receiveDate} جهت بررسی و تعمیر دریافت گردید. واحد تعمیرات شرکت مهندسی کسرا رایانه آپادانا www.maxasecurity.com 021-78756800 09965012695`;
      break;

    case 'inspection':
      title = "ارسال پیامک بررسی اولیه";
      stepName = "مرحله ۲: بررسی اولیه";
      bodyId = settings?.smsBodyIdInspection || "384735";
      dbField = 'smsSentInspection';
      const deliveryTime = getDeliveryEstimateByCompany(repairCompany);
      variables = [customer, person, model, serial, deliveryTime];
      previewMessage = `شرکت ${customer} آقا/خانم ${person} دستگاه ${model} به شماره سریال ${serial} مورد بررسی اولیه قرار گرفت و نتیجه بررسی در ${deliveryTime} اعلام خواهد شد. *در صورت نیاز به دستگاه جایگزین و انعقاد قرارداد بیمه با واحد خدمات پس از فروش 78756400-021 تماس حاصل فرمایید.* واحد تعمیرات شرکت مهندسی کسرا رایانه آپادانا www.maxasecurity.com 021-78756800 09965012695`;
      break;

    case 'cost':
      title = "ارسال پیامک اعلام هزینه";
      stepName = "مرحله ۳: اعلام هزینه";
      bodyId = settings?.smsBodyIdCost || "384746";
      dbField = 'smsSentCost';
      variables = [customer, person, model, serial];
      previewMessage = `شرکت ${customer} آقا/خانم ${person} دستگاه ${model} به شماره سریال ${serial} مورد بررسی قرار گرفت و هزینه انجام خدمات در قالب پیش فاکتور در واتس اپ ارسال گردید. لازم به ذکر انجام خدمات منوط به ارسال تایید پیش فاکتور خواهد بود . واحد تعمیرات شرکت مهندسی کسرا رایانه آپادانا www.maxasecurity.com 021-78756800 09965012695`;
      break;

    case 'cost_approved':
      title = "ارسال پیامک تایید اعلام هزینه";
      stepName = "مرحله ۳: تایید اعلام هزینه";
      bodyId = settings?.smsBodyIdCostApproved || "384747";
      dbField = 'smsSentCostApproved';
      variables = [customer, person, model, serial];
      previewMessage = `شرکت ${customer} آقا/خانم ${person} دستگاه ${model} به شماره سریال ${serial} تاییدیه هزینه اعلام شده جهت تعمیرات توسط جنابعالی در واتس آپ دریافت گردید و تعمیر دستگاه شما از این تاریخ در اولویت کاری قرار گرفت. واحد تعمیرات شرکت مهندسی کسرا رایانه آپادانا www.maxasecurity.com 021-78756800 09965012695`;
      break;

    case 'replacement':
      title = "ارسال پیامک دستگاه جایگزین";
      stepName = "مرحله ۴: دستگاه جایگزین";
      bodyId = settings?.smsBodyIdReplacement || "400795";
      dbField = 'smsSentReplacement';
      variables = [customer, person, model, serial];
      previewMessage = `شرکت ${customer} آقا/خانم ${person} دستگاه ${model} به شماره سریال ${serial} باتوجه به زمانبر بودن تعمیرات ، تا زمان انجام تعمیرات دستگاه جایگزین در اختیار شما قرار خواهد گرفت. لطفا جهت دریافت دستگاه جایگزین ، طی دو روزکاری آینده از ساعت 13 الی 18 ، با ارائه معرفی نامه به شرکت مراجعه فرمایید. واحد تعمیرات شرکت مهندسی کسرا رایانه آپادانا(مکسا) www.maxasecurity.com 021-78756800 09965012695`;
      break;

    case 'shipping':
      title = "ارسال پیامک اطلاعات تحویل و ارسال";
      stepName = "مرحله ۵: تحویل و ارسال";
      bodyId = settings?.smsBodyIdShipping || "384757";
      dbField = 'smsSentShipping';
      variables = [customer, person, model, serial];
      previewMessage = `شرکت ${customer} آقا/خانم ${person} دستگاه ${model} به شماره سریال ${serial} تعمیر دستگاه شما پایان یافت ، لطفا طی دو روزکاری آینده از ساعت 13 الی 17 ، همراه با معرفی نامه و فیش واریزی جهت دریافت دستگاه به شرکت مراجعه فرمایید. واحد تعمیرات شرکت مهندسی کسرا رایانه آپادانا www.maxasecurity.com 021-78756800 09965012695`;
      break;
  }

  return {
    smsType,
    title,
    stepName,
    bodyId,
    phone,
    recipientName: person || customer || "مشتری گرامی",
    variables,
    previewMessage,
    dbField
  };
}
