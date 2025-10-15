import { Customer } from '../../domain/entities/Customer.js';
import { CustomerFilterDto } from '../dtos/CustomerDto.js';

export interface ICustomerRepository {
  save(customer: Customer): Promise<void>;
  findById(id: string): Promise<Customer | null>;
  findByExternalId(externalId: string): Promise<Customer | null>;
  findByExternalBillingId(externalBillingId: string): Promise<Customer | null>;
  findAll(filters?: CustomerFilterDto): Promise<Customer[]>;
  delete(id: string): Promise<void>;
  exists(id: string): Promise<boolean>;
}

