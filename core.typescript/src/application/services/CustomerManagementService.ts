import { ICustomerRepository } from '../repositories/ICustomerRepository.js';
import { 
  CreateCustomerDto, 
  CreateCustomerDtoSchema, 
  UpdateCustomerDto, 
  UpdateCustomerDtoSchema,
  CustomerFilterDto,
  CustomerFilterDtoSchema,
  CustomerDto 
} from '../dtos/CustomerDto.js';
import { CustomerMapper } from '../mappers/CustomerMapper.js';
import { Customer } from '../../domain/entities/Customer.js';
import { CustomerStatus } from '../../domain/value-objects/index.js';
import { generateId } from '../../infrastructure/utils/uuid.js';
import { 
  ValidationError, 
  NotFoundError, 
  ConflictError 
} from '../errors/index.js';

export class CustomerManagementService {
  constructor(
    private readonly customerRepository: ICustomerRepository
  ) {}

  async createCustomer(dto: CreateCustomerDto): Promise<CustomerDto> {
    const validationResult = CreateCustomerDtoSchema.safeParse(dto);
    if (!validationResult.success) {
      throw new ValidationError(
        'Invalid customer data',
        validationResult.error.errors
      );
    }
    const validatedDto = validationResult.data;

    // Check if key already exists
    const existing = await this.customerRepository.findByExternalId(validatedDto.key);
    if (existing) {
      throw new ConflictError(`Customer with key '${validatedDto.key}' already exists`);
    }

    // Check if external billing ID already exists (if provided)
    if (validatedDto.externalBillingId) {
      const existingBilling = await this.customerRepository.findByExternalBillingId(validatedDto.externalBillingId);
      if (existingBilling) {
        throw new ConflictError(`Customer with external billing ID '${validatedDto.externalBillingId}' already exists`);
      }
    }

    const id = generateId();
    const customer = new Customer({
      key: validatedDto.key,
      displayName: validatedDto.displayName,
      email: validatedDto.email,
      externalBillingId: validatedDto.externalBillingId,
      status: CustomerStatus.Active,
      metadata: validatedDto.metadata,
      createdAt: new Date(),
      updatedAt: new Date()
    }, id);

    await this.customerRepository.save(customer);
    return CustomerMapper.toDto(customer);
  }

  async updateCustomer(externalId: string, dto: UpdateCustomerDto): Promise<CustomerDto> {
    const validationResult = UpdateCustomerDtoSchema.safeParse(dto);
    if (!validationResult.success) {
      throw new ValidationError(
        'Invalid update data',
        validationResult.error.errors
      );
    }
    const validatedDto = validationResult.data;

    const customer = await this.customerRepository.findByExternalId(externalId);
    if (!customer) {
      throw new NotFoundError(`Customer with external ID '${externalId}' not found`);
    }

    // Check for conflicts if updating key
    if (validatedDto.key && validatedDto.key !== customer.key) {
      const existing = await this.customerRepository.findByExternalId(validatedDto.key);
      if (existing && existing.id !== customer.id) {
        throw new ConflictError(`Customer with key '${validatedDto.key}' already exists`);
      }
    }

    if (validatedDto.externalBillingId && validatedDto.externalBillingId !== customer.props.externalBillingId) {
      const existing = await this.customerRepository.findByExternalBillingId(validatedDto.externalBillingId);
      if (existing && existing.id !== customer.id) {
        throw new ConflictError(`Customer with external billing ID '${validatedDto.externalBillingId}' already exists`);
      }
    }

    // Update properties
    if (validatedDto.key !== undefined) {
      customer.props.key = validatedDto.key;
    }
    if (validatedDto.displayName !== undefined) {
      customer.props.displayName = validatedDto.displayName;
    }
    if (validatedDto.email !== undefined) {
      customer.props.email = validatedDto.email;
    }
    if (validatedDto.externalBillingId !== undefined) {
      customer.props.externalBillingId = validatedDto.externalBillingId;
    }
    if (validatedDto.metadata !== undefined) {
      customer.props.metadata = validatedDto.metadata;
    }

    customer.props.updatedAt = new Date();
    await this.customerRepository.save(customer);
    return CustomerMapper.toDto(customer);
  }

  async getCustomer(externalId: string): Promise<CustomerDto | null> {
    const customer = await this.customerRepository.findByExternalId(externalId);
    return customer ? CustomerMapper.toDto(customer) : null;
  }

  async listCustomers(filters: CustomerFilterDto = { limit: 50, offset: 0 }): Promise<CustomerDto[]> {
    const validationResult = CustomerFilterDtoSchema.safeParse(filters);
    if (!validationResult.success) {
      throw new ValidationError(
        'Invalid filter parameters',
        validationResult.error.errors
      );
    }

    const customers = await this.customerRepository.findAll(validationResult.data);
    return customers.map(CustomerMapper.toDto);
  }

  async activateCustomer(externalId: string): Promise<void> {
    const customer = await this.customerRepository.findByExternalId(externalId);
    if (!customer) {
      throw new NotFoundError(`Customer with external ID '${externalId}' not found`);
    }

    customer.activate();
    await this.customerRepository.save(customer);
  }

  async suspendCustomer(externalId: string): Promise<void> {
    const customer = await this.customerRepository.findByExternalId(externalId);
    if (!customer) {
      throw new NotFoundError(`Customer with external ID '${externalId}' not found`);
    }

    customer.suspend();
    await this.customerRepository.save(customer);
  }

  async markCustomerDeleted(externalId: string): Promise<void> {
    const customer = await this.customerRepository.findByExternalId(externalId);
    if (!customer) {
      throw new NotFoundError(`Customer with external ID '${externalId}' not found`);
    }

    customer.markDeleted();
    await this.customerRepository.save(customer);
  }

  async deleteCustomer(externalId: string): Promise<void> {
    const customer = await this.customerRepository.findByExternalId(externalId);
    if (!customer) {
      throw new NotFoundError(`Customer with external ID '${externalId}' not found`);
    }

    if (!customer.canDelete()) {
      throw new ValidationError(
        `Cannot delete customer with status '${customer.status}'. ` +
        'Customer must be marked as deleted before permanent deletion.'
      );
    }

    await this.customerRepository.delete(customer.id);
  }
}
