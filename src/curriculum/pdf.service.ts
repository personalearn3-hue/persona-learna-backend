import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { PDFParse } from 'pdf-parse';

@Injectable()
export class PdfService {
  private readonly logger = new Logger(PdfService.name);

  async extractTextFromBuffer(buffer): Promise<string> {
    try {
      const data = new PDFParse({ url: buffer });
      console.log({ data })
      const result = await data.getText()
      console.log({ result })
      return result.text
    } catch (error) {
      this.logger.error('Error extracting text from PDF:', error);
      throw new BadRequestException('Failed to extract text from PDF');
    }
  }

  /**
   * Extract text from PDF URL (Cloudinary URL)
   */
  async extractTextFromUrl(pdfUrl: string): Promise<string> {
    try {
      // Download PDF from Cloudinary
      const response = await axios.get(pdfUrl, {
        responseType: 'arraybuffer',
      });

      const buffer = Buffer.from(response.data);
      return await this.extractTextFromBuffer(buffer);
    } catch (error) {
      this.logger.error('Error downloading/extracting PDF from URL:', error);
      throw new BadRequestException('Failed to extract text from PDF URL');
    }
  }

  /**
   * Extract metadata from curriculum text using pattern matching
   */
  extractMetadata(text: string): {
    institutionName?: string;
    tutorName?: string;
    dateCreated?: string;
    courseRequirements?: string;
    technologyRequirements?: string;
    professorContact?: string;
  } {
    const metadata: any = {};

    // Extract institution name (common patterns)
    const institutionPatterns = [
      /(?:University|College|Institute|School)[\s:]+([^\n]+)/i,
      /Institution[\s:]+([^\n]+)/i,
    ];
    for (const pattern of institutionPatterns) {
      const match = text.match(pattern);
      if (match) {
        metadata.institutionName = match[1].trim();
        break;
      }
    }

    // Extract tutor/professor name
    const tutorPatterns = [
      /(?:Professor|Instructor|Tutor|Teacher)[\s:]+([^\n]+)/i,
      /Taught by[\s:]+([^\n]+)/i,
    ];
    for (const pattern of tutorPatterns) {
      const match = text.match(pattern);
      if (match) {
        metadata.tutorName = match[1].trim();
        break;
      }
    }

    // Extract date
    const datePatterns = [
      /Date[\s:]+([^\n]+)/i,
      /Created[\s:]+([^\n]+)/i,
      /\b(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\b/,
    ];
    for (const pattern of datePatterns) {
      const match = text.match(pattern);
      if (match) {
        metadata.dateCreated = match[1].trim();
        break;
      }
    }

    // Extract course requirements
    const reqMatch = text.match(
      /(?:Course Requirements|Prerequisites)[\s:]+([^\n]{20,})/i,
    );
    if (reqMatch) {
      metadata.courseRequirements = reqMatch[1].trim();
    }

    // Extract technology requirements
    const techMatch = text.match(
      /(?:Technology|Technical) Requirements[\s:]+([^\n]{20,})/i,
    );
    if (techMatch) {
      metadata.technologyRequirements = techMatch[1].trim();
    }

    // Extract contact information
    const contactMatch = text.match(/(?:Contact|Email)[\s:]+([^\n]+)/i);
    if (contactMatch) {
      metadata.professorContact = contactMatch[1].trim();
    }

    return metadata;
  }
}