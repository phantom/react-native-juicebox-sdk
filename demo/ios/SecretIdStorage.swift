//
//  JuiceboxSdk.swift
//  JuiceboxDemo
//
//  Created by Nora Trapp on 10/16/23.
//

import Foundation
import CloudKit
import React

@objc(SecretIdStorage)
class SecretIdStorage: NSObject {
  enum AccountError: Error {
    case notRegistered
    case parentalRestriction
    case noRecord
  }

  let container = CKContainer.default()

  static let recordType = "SecretId"
  static let recordId = CKRecord.ID(recordName: "xyz.juicebox.jbid")

  @objc
  func isAvailable(
    _ resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    Task {
      do {
        try await checkAccountStatus()
        resolve(())
      } catch {
        reject("\((error as NSError).code)", "storage not available: \(error)", error)
      }
    }
  }

  @objc
  func delete(
    _ resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    Task {
      do {
        try await checkAccountStatus()
        try await container.privateCloudDatabase.deleteRecord(withID: Self.recordId)
        resolve(())
      } catch {
        reject("\((error as NSError).code)", "Failed to delete record: \(error)", error)
      }
    }
  }

  @objc
  func register(
    _ secretId: String,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    Task {
      do {
        try await checkAccountStatus()

        let record: CKRecord

        do {
          record = try await fetchExistingRecord()
        } catch AccountError.noRecord {
          record = CKRecord(recordType: Self.recordType, recordID: Self.recordId)
        }

        record.setValue(secretId, forKey: Self.recordType)
        try await container.privateCloudDatabase.save(record)

        resolve(())
      } catch {
        reject("\((error as NSError).code)", "Failed to save record: \(error)", error)
      }
    }
  }

  @objc
  func recover(
    _ resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    Task {
      do {
        try await checkAccountStatus()
        let record = try await fetchExistingRecord()
        guard let secretId = record.value(forKey: Self.recordType) as? String else {
          throw AccountError.noRecord
        }
        resolve(secretId)
      } catch {
        reject("\((error as NSError).code)", "Failed to fetch record: \(error)", error)
      }
    }
  }

  private func fetchExistingRecord() async throws -> CKRecord {
    do {
      return try await container.privateCloudDatabase.record(for: Self.recordId)
    } catch CKError.unknownItem {
      throw AccountError.noRecord
    }
  }

  private func checkAccountStatus() async throws {
    switch try await container.accountStatus() {
    case .couldNotDetermine, .noAccount, .temporarilyUnavailable:
      throw AccountError.notRegistered
    case .available:
      return
    case .restricted:
      throw AccountError.parentalRestriction
    @unknown default:
      throw AccountError.notRegistered
    }
  }
}
